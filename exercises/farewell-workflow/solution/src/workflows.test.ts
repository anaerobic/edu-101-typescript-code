import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, Runtime, DefaultLogger, LogEntry } from '@temporalio/worker';
import { WorkflowCoverage } from '@temporalio/nyc-test-coverage';
import { randomUUID } from 'crypto';
import { greeting } from './workflows';

let testEnv: TestWorkflowEnvironment;

const workflowCoverage = new WorkflowCoverage();

beforeAll(async () => {
  // Use console.log instead of console.error to avoid red output
  // Filter INFO log messages for clearer test output
  Runtime.install({
    logger: new DefaultLogger('WARN', (entry: LogEntry) => console.log(`[${entry.level}]`, entry.message)),
  });

  testEnv = await TestWorkflowEnvironment.createLocal();
});

afterAll(async () => {
  await testEnv?.teardown();
});

afterAll(() => {
  workflowCoverage.mergeIntoGlobalCoverage();
});

test('greetingWorkflow with mock activities', async () => {
  const { client, nativeConnection } = testEnv;

  const spanishFarewell = 'Adiós'
  const spanishGreeting = 'Hola'

  const worker = await Worker.create(
    workflowCoverage.augmentWorkerOptions({
      connection: nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('./workflows'),
      activities: {
        getSpanishGreeting: async (name: string): Promise<string> => `${spanishGreeting} ${name}`,
        getSpanishFarewell: async (name: string): Promise<string> => `${spanishFarewell} ${name}`,
      },
    })
  );

  await worker.runUntil(async () => {
    const name = 'Testman'
    const handle = await client.workflow.start(greeting, {
      workflowId: randomUUID(),
      taskQueue: 'test',
      args: [
        name,
      ],
    });
    expect(
      await handle.result()
    ).toBe(`\n${spanishGreeting} ${name}\n${spanishFarewell} ${name}`)
  });
});