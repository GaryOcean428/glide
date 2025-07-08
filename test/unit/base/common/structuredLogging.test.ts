/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { StructuredLogger, LogLevel, LogEntry, logError, logWarn, logInfo, logDebug, logTrace } from '../../../src/vs/base/common/structuredLogging.js';
import { strict as assert } from 'assert';

suite('StructuredLogging', () => {
	let logger: StructuredLogger;

	setup(() => {
		logger = new StructuredLogger({ 
			enableConsoleOutput: false,
			minLevel: LogLevel.TRACE
		});
	});

	teardown(() => {
		logger.clearLogs();
	});

	suite('Basic Logging', () => {
		test('should log error messages', () => {
			logger.error('Test error message', { errorCode: 'TEST_ERROR' });
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].level, LogLevel.ERROR);
			assert.strictEqual(logs[0].message, 'Test error message');
			assert.strictEqual(logs[0].context.errorCode, 'TEST_ERROR');
		});

		test('should log warning messages', () => {
			logger.warn('Test warning message', { warningCode: 'TEST_WARNING' });
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].level, LogLevel.WARN);
			assert.strictEqual(logs[0].message, 'Test warning message');
			assert.strictEqual(logs[0].context.warningCode, 'TEST_WARNING');
		});

		test('should log info messages', () => {
			logger.info('Test info message', { infoCode: 'TEST_INFO' });
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].level, LogLevel.INFO);
			assert.strictEqual(logs[0].message, 'Test info message');
			assert.strictEqual(logs[0].context.infoCode, 'TEST_INFO');
		});

		test('should log debug messages', () => {
			logger.debug('Test debug message', { debugCode: 'TEST_DEBUG' });
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].level, LogLevel.DEBUG);
			assert.strictEqual(logs[0].message, 'Test debug message');
			assert.strictEqual(logs[0].context.debugCode, 'TEST_DEBUG');
		});

		test('should log trace messages', () => {
			logger.trace('Test trace message', { traceCode: 'TEST_TRACE' });
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].level, LogLevel.TRACE);
			assert.strictEqual(logs[0].message, 'Test trace message');
			assert.strictEqual(logs[0].context.traceCode, 'TEST_TRACE');
		});
	});

	suite('Log Level Filtering', () => {
		test('should respect minimum log level', () => {
			const restrictiveLogger = new StructuredLogger({ 
				enableConsoleOutput: false,
				minLevel: LogLevel.WARN
			});
			
			restrictiveLogger.trace('Trace message');
			restrictiveLogger.debug('Debug message');
			restrictiveLogger.info('Info message');
			restrictiveLogger.warn('Warning message');
			restrictiveLogger.error('Error message');
			
			const logs = restrictiveLogger.getLogs();
			assert.strictEqual(logs.length, 2);
			assert.strictEqual(logs[0].level, LogLevel.WARN);
			assert.strictEqual(logs[1].level, LogLevel.ERROR);
		});

		test('should filter logs by level', () => {
			logger.error('Error message');
			logger.warn('Warning message');
			logger.info('Info message');
			logger.debug('Debug message');
			
			const errorLogs = logger.getLogsByLevel(LogLevel.ERROR);
			assert.strictEqual(errorLogs.length, 1);
			assert.strictEqual(errorLogs[0].level, LogLevel.ERROR);
			
			const warnAndAbove = logger.getLogsByLevel(LogLevel.WARN);
			assert.strictEqual(warnAndAbove.length, 2);
		});
	});

	suite('Log Entry Structure', () => {
		test('should include timestamp in log entries', () => {
			const beforeLog = Date.now();
			logger.info('Test message');
			const afterLog = Date.now();
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			
			const logTime = new Date(logs[0].timestamp).getTime();
			assert.ok(logTime >= beforeLog);
			assert.ok(logTime <= afterLog);
		});

		test('should include source information when provided', () => {
			logger.info('Test message', undefined, 'TestSuite.testMethod');
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].source, 'TestSuite.testMethod');
		});

		test('should include metadata in log entries', () => {
			logger.info('Test message');
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.ok(logs[0].metadata);
			assert.ok('userAgent' in logs[0].metadata);
			assert.ok('url' in logs[0].metadata);
		});
	});

	suite('Log Management', () => {
		test('should clear all logs', () => {
			logger.info('Test message 1');
			logger.info('Test message 2');
			
			assert.strictEqual(logger.getLogs().length, 2);
			
			logger.clearLogs();
			assert.strictEqual(logger.getLogs().length, 0);
		});

		test('should export logs as JSON', () => {
			logger.info('Test message', { key: 'value' });
			
			const exported = logger.exportLogs();
			const parsed = JSON.parse(exported);
			
			assert.ok(Array.isArray(parsed));
			assert.strictEqual(parsed.length, 1);
			assert.strictEqual(parsed[0].message, 'Test message');
			assert.strictEqual(parsed[0].context.key, 'value');
		});

		test('should limit log entries to prevent memory issues', () => {
			const limitedLogger = new StructuredLogger({ 
				enableConsoleOutput: false,
				minLevel: LogLevel.TRACE
			});
			
			// Simulate exceeding the max log entries
			for (let i = 0; i < 1200; i++) {
				limitedLogger.info(`Message ${i}`);
			}
			
			const logs = limitedLogger.getLogs();
			assert.ok(logs.length <= 1000);
			
			// Should keep the most recent entries
			const lastLog = logs[logs.length - 1];
			assert.strictEqual(lastLog.message, 'Message 1199');
		});
	});

	suite('Configuration', () => {
		test('should update minimum log level dynamically', () => {
			logger.setMinLevel(LogLevel.ERROR);
			
			logger.debug('Debug message');
			logger.info('Info message');
			logger.warn('Warning message');
			logger.error('Error message');
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].level, LogLevel.ERROR);
		});

		test('should enable and disable console output', () => {
			logger.setConsoleOutput(true);
			assert.ok(logger.options?.enableConsoleOutput);
			
			logger.setConsoleOutput(false);
			assert.ok(!logger.options?.enableConsoleOutput);
		});
	});

	suite('Global Logger Functions', () => {
		test('should use global logger functions', () => {
			// Clear any existing logs
			logger.clearLogs();
			
			logError('Global error message');
			logWarn('Global warning message');
			logInfo('Global info message');
			logDebug('Global debug message');
			logTrace('Global trace message');
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 5);
			
			assert.strictEqual(logs[0].level, LogLevel.ERROR);
			assert.strictEqual(logs[0].message, 'Global error message');
			
			assert.strictEqual(logs[1].level, LogLevel.WARN);
			assert.strictEqual(logs[1].message, 'Global warning message');
			
			assert.strictEqual(logs[2].level, LogLevel.INFO);
			assert.strictEqual(logs[2].message, 'Global info message');
			
			assert.strictEqual(logs[3].level, LogLevel.DEBUG);
			assert.strictEqual(logs[3].message, 'Global debug message');
			
			assert.strictEqual(logs[4].level, LogLevel.TRACE);
			assert.strictEqual(logs[4].message, 'Global trace message');
		});
	});

	suite('Error Scenarios', () => {
		test('should handle logging with complex context objects', () => {
			const complexContext = {
				user: { id: 123, name: 'Test User' },
				request: { method: 'GET', url: '/api/test' },
				error: new Error('Test error'),
				metadata: { 
					timestamp: new Date(),
					nested: { value: 'deeply nested' }
				}
			};
			
			logger.error('Complex context test', complexContext);
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 1);
			assert.strictEqual(logs[0].context.user.id, 123);
			assert.strictEqual(logs[0].context.user.name, 'Test User');
			assert.strictEqual(logs[0].context.request.method, 'GET');
			assert.strictEqual(logs[0].context.metadata.nested.value, 'deeply nested');
		});

		test('should handle null and undefined context', () => {
			logger.info('Message with null context', null);
			logger.info('Message with undefined context', undefined);
			
			const logs = logger.getLogs();
			assert.strictEqual(logs.length, 2);
			assert.strictEqual(logs[0].context, null);
			assert.strictEqual(logs[1].context, undefined);
		});
	});

	suite('Performance Logging', () => {
		test('should measure execution time', () => {
			const startTime = Date.now();
			
			class TestClass {
				@logPerformance
				async testMethod(delay: number): Promise<string> {
					return new Promise(resolve => {
						setTimeout(() => resolve('completed'), delay);
					});
				}
			}
			
			const testInstance = new TestClass();
			return testInstance.testMethod(10).then(result => {
				assert.strictEqual(result, 'completed');
				
				const logs = logger.getLogs();
				const perfLog = logs.find(log => log.message.includes('TestClass.testMethod'));
				assert.ok(perfLog);
				assert.ok(perfLog.context.duration >= 10);
			});
		});
	});

	suite('Singleton Pattern', () => {
		test('should return same instance for singleton', () => {
			const instance1 = StructuredLogger.getInstance();
			const instance2 = StructuredLogger.getInstance();
			
			assert.strictEqual(instance1, instance2);
		});
	});
});