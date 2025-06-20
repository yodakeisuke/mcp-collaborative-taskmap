import { Result, ok, err, ResultAsync } from 'neverthrow';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { WorkPlan } from '../../domain/term/plan/work_plan.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = resolve(currentDir, '../../../data/plans');

type StorageError = {
  type: 'StorageError';
  message: string;
  cause?: Error;
};

type WriteOperation = {
  readonly filePath: string;
  readonly tempPath: string;
  readonly content: string;
};

const createStorageError = (message: string, cause?: Error): StorageError => ({
  type: 'StorageError',
  message,
  cause
});

const ensureStorageDir = (): ResultAsync<void, StorageError> =>
  ResultAsync.fromPromise(
    fs.mkdir(STORAGE_DIR, { recursive: true }),
    error => createStorageError(
      `Failed to create storage directory: ${(error as Error).message}`,
      error as Error
    )
  ).map(() => undefined);

const serializeDates = (obj: any): any => {
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeDates);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeDates(v)])
    );
  }
  return obj;
};

const prepareWriteOperation = (plan: WorkPlan): Result<WriteOperation, StorageError> => {
  try {
    const filePath = join(STORAGE_DIR, 'current_plan.json');
    const serialized = serializeDates(plan);
    const content = JSON.stringify(serialized, null, 2);
    
    return ok({
      filePath,
      tempPath: `${filePath}.tmp`,
      content
    });
  } catch (error) {
    return err(createStorageError('Failed to prepare write operation', error as Error));
  }
};

const writeToTempFile = (operation: WriteOperation): ResultAsync<WriteOperation, StorageError> =>
  ResultAsync.fromPromise(
    fs.writeFile(operation.tempPath, operation.content),
    error => createStorageError('Failed to write temp file', error as Error)
  ).map(() => operation);

const atomicMove = (operation: WriteOperation): ResultAsync<void, StorageError> =>
  ResultAsync.fromPromise(
    fs.rename(operation.tempPath, operation.filePath),
    error => createStorageError('Failed to move temp file', error as Error)
  ).map(() => undefined);

const cleanupTempFile = (tempPath: string): void => {
  fs.unlink(tempPath).catch(() => {});
};

const executeWrite = (operation: WriteOperation): ResultAsync<void, StorageError> =>
  writeToTempFile(operation)
    .andThen(atomicMove)
    .mapErr(error => {
      cleanupTempFile(operation.tempPath);
      return error;
    });

export const savePlan = (plan: WorkPlan): ResultAsync<WorkPlan, StorageError> =>
  ensureStorageDir()
    .andThen(() => {
      const operationResult = prepareWriteOperation(plan);
      if (operationResult.isErr()) {
        return ResultAsync.fromSafePromise(Promise.reject(operationResult.error));
      }
      return executeWrite(operationResult.value);
    })
    .map(() => plan);

const deserializeDates = (obj: any): any => {
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(obj)) {
    return new Date(obj);
  }
  if (Array.isArray(obj)) return obj.map(deserializeDates);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deserializeDates(v)])
    );
  }
  return obj;
};

export const loadCurrentPlan = (): ResultAsync<WorkPlan | null, StorageError> =>
  ResultAsync.fromPromise(
    fs.readFile(join(STORAGE_DIR, 'current_plan.json'), 'utf-8')
      .then(content => deserializeDates(JSON.parse(content)) as WorkPlan)
      .catch(error => {
        if ((error as any).code === 'ENOENT') {
          return null;
        }
        throw error;
      }),
    error => createStorageError('Failed to load current plan', error as Error)
  );