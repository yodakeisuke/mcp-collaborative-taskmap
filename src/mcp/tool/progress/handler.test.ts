import { describe, it, expect, vi, beforeEach } from 'vitest';
import { progressEntryPoint } from './handler.js';
import { ProgressToolParameters } from './schema.js';
import * as planStorage from '../../../effect/storage/planStorage.js';
import { ok, err, ResultAsync } from 'neverthrow';
import { WorkPlan } from '../../../domain/term/plan/work_plan.js';
import { PrTask } from '../../../domain/term/task/pr_task.js';
import { PrTaskStatus } from '../../../domain/term/task/status.js';
import { ID } from '../../../common/primitive.js';
import { WorkPlanId } from '../../../domain/term/plan/work_plan_id.js';

// Mock the storage module
vi.mock('../../../effect/storage/planStorage.js');

describe('progressEntryPoint', () => {
  const mockPlanId = 'plan-123' as unknown as WorkPlanId;
  const mockTaskId = 'task-123';
  
  const createMockTask = (overrides?: Partial<PrTask>): PrTask => ({
    id: mockTaskId as any,
    title: 'Test Task',
    description: 'Test Description',
    branch: 'feature/test-branch',
    worktree: '',
    status: PrTaskStatus.refined(),
    acceptanceCriteria: [
      {
        id: 'ac1',
        scenario: 'Test scenario 1',
        given: ['Given condition 1'],
        when: ['When action 1'],
        then: ['Then result 1'],
        isCompleted: false,
        createdAt: new Date()
      },
      {
        id: 'ac2',
        scenario: 'Test scenario 2',
        given: ['Given condition 2'],
        when: ['When action 2'],
        then: ['Then result 2'],
        isCompleted: false,
        createdAt: new Date()
      }
    ],
    definitionOfReady: [],
    dependencies: [],
    ...overrides
  });

  const createMockPlan = (tasks: PrTask[] = [createMockTask()]): WorkPlan => ({
    id: mockPlanId,
    name: 'Test Plan',
    description: 'Test Plan Description',
    featureBranch: 'feature/test',
    originWorktreePath: '/test/path',
    tasks,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return valid CallToolResult structure with text messages', async () => {
    const mockPlan = createMockPlan();
    
    vi.mocked(planStorage.loadCurrentPlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );
    
    vi.mocked(planStorage.savePlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );

    const args: ProgressToolParameters = {
      taskId: mockTaskId,
      criteriaUpdates: [
        { id: 'ac1', completed: true }
      ]
    };

    const result = await progressEntryPoint(args);
    
    // Verify structure
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('isError');
    expect(result.isError).toBe(false);
    
    // Verify content is array
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBe(2);
    
    // Verify each content item has correct structure
    result.content.forEach((item: any) => {
      expect(item).toHaveProperty('type', 'text');
      expect(item).toHaveProperty('text');
      expect(typeof item.text).toBe('string');
    });

    // Check that no [object Object] appears
    const texts = result.content.map((c: any) => c.text);
    texts.forEach((text: string) => {
      expect(text).not.toContain('[object Object]');
    });
    
    // Verify first message is the progress update
    expect(texts[0]).toContain('Progress updated');
    expect(texts[0]).toContain('1/2 criteria completed');
    
    // Verify second message is valid JSON
    const jsonText = texts[1];
    expect(() => JSON.parse(jsonText)).not.toThrow();
    
    const parsed = JSON.parse(jsonText);
    expect(parsed).toHaveProperty('nextAction');
    expect(parsed).toHaveProperty('task');
    expect(parsed.task).toHaveProperty('id', mockTaskId);
    expect(parsed.task).toHaveProperty('title', 'Test Task');
    expect(parsed.task).toHaveProperty('status', 'Refined');
    expect(parsed.task).toHaveProperty('acceptanceCriteria');
    expect(parsed.task).toHaveProperty('progress');
    expect(parsed.task.progress).toEqual({
      completed: 1,
      total: 2,
      percentage: 50
    });
  });

  it('should handle 100% completion and status transition', async () => {
    const mockTask = createMockTask();
    const mockPlan = createMockPlan([mockTask]);
    
    vi.mocked(planStorage.loadCurrentPlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );
    
    vi.mocked(planStorage.savePlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );

    const args: ProgressToolParameters = {
      taskId: mockTaskId,
      criteriaUpdates: [
        { id: 'ac1', completed: true },
        { id: 'ac2', completed: true }
      ]
    };

    const result = await progressEntryPoint(args);
    
    expect(result.isError).toBe(false);
    const texts = result.content.map((c: any) => c.text);
    
    // Should indicate all criteria completed and status transition
    expect(texts[0]).toContain('All acceptance criteria completed');
    // Could be either "ready for review" (if Implemented) or "automatically marked as Implemented" (if was Refined)
    expect(texts[0]).toMatch(/ready for review|automatically marked as Implemented/);
    
    // Verify JSON response
    const parsed = JSON.parse(texts[1]);
    expect(parsed.task.progress).toEqual({
      completed: 2,
      total: 2,
      percentage: 100
    });
  });

  it('should handle plan not found error', async () => {
    vi.mocked(planStorage.loadCurrentPlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(null))
    );

    const args: ProgressToolParameters = {
      taskId: 'some-task-id',
      criteriaUpdates: [{ id: 'ac1', completed: true }]
    };

    const result = await progressEntryPoint(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No current plan found');
  });

  it('should handle task not found error', async () => {
    const mockPlan = createMockPlan(); // Has task with id 'task-123'
    
    vi.mocked(planStorage.loadCurrentPlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );

    const args: ProgressToolParameters = {
      taskId: 'non-existent-task',
      criteriaUpdates: [{ id: 'ac1', completed: true }]
    };

    const result = await progressEntryPoint(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Task not found: non-existent-task');
  });

  it('should handle storage error on load', async () => {
    vi.mocked(planStorage.loadCurrentPlan).mockReturnValue(
      ResultAsync.fromPromise(
        Promise.reject(new Error('Storage read error')),
        (e: any) => ({ type: 'StorageError' as const, message: e.message })
      )
    );

    const args: ProgressToolParameters = {
      taskId: 'some-task-id',
      criteriaUpdates: [{ id: 'ac1', completed: true }]
    };

    const result = await progressEntryPoint(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to load plan');
    expect(result.content[0].text).toContain('Storage read error');
  });

  it('should handle storage error on save', async () => {
    const mockPlan = createMockPlan();
    
    vi.mocked(planStorage.loadCurrentPlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );
    
    vi.mocked(planStorage.savePlan).mockReturnValue(
      ResultAsync.fromPromise(
        Promise.reject(new Error('Storage write error')),
        (e: any) => ({ type: 'StorageError' as const, message: e.message })
      )
    );

    const args: ProgressToolParameters = {
      taskId: mockTaskId,
      criteriaUpdates: [{ id: 'ac1', completed: true }]
    };

    const result = await progressEntryPoint(args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to save plan');
    expect(result.content[0].text).toContain('Storage write error');
  });

  it('should output exact format to diagnose [object Object] issue', async () => {
    const mockPlan = createMockPlan();
    
    vi.mocked(planStorage.loadCurrentPlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );
    
    vi.mocked(planStorage.savePlan).mockReturnValue(
      ResultAsync.fromSafePromise(Promise.resolve(mockPlan))
    );

    const args: ProgressToolParameters = {
      taskId: mockTaskId,
      criteriaUpdates: [{ id: 'ac1', completed: true }]
    };

    const result = await progressEntryPoint(args);
    
    // Debug output removed - tests confirmed handler returns correct format
    
    // Ensure we're getting what we expect
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Progress updated: 1/2 criteria completed')
        },
        {
          type: 'text',
          text: expect.stringMatching(/^\{[\s\S]*}$/) // Valid JSON
        }
      ],
      isError: false
    });
  });
});