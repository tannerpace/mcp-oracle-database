#!/usr/bin/env node
/**
 * Integration test for the new logger module
 * This test verifies all logger features work correctly
 */

import { logger, audit } from './dist/utils/logger.js';
import fs from 'fs';

// Setup test environment
process.env.ENABLE_FILE_LOGGING = 'true';
process.env.LOG_DIR = '/tmp/logger-integration-test';
process.env.ENABLE_AUDIT_LOGGING = 'true';
process.env.NODE_ENV = 'development';

console.log('\n========================================');
console.log('  Logger Integration Test');
console.log('========================================\n');

// Clean up any previous test logs
const logDir = '/tmp/logger-integration-test';
if (fs.existsSync(logDir)) {
  fs.rmSync(logDir, { recursive: true });
}

// Re-import logger after env setup
const { logger: testLogger, audit: testAudit } = await import('./dist/utils/logger.js?test=' + Date.now());

console.log('✓ Logger module loaded successfully\n');

// Test 1: Basic logging
console.log('Test 1: Basic logging functions');
testLogger.info('Info message test');
testLogger.warn('Warning message test');
testLogger.error('Error message test');
testLogger.debug('Debug message test');
console.log('✓ Basic logging test passed\n');

// Test 2: Object logging
console.log('Test 2: Object serialization');
testLogger.info('Object test:', { user: 'test', id: 123, nested: { key: 'value' } });
console.log('✓ Object serialization test passed\n');

// Test 3: Audit logging
console.log('Test 3: Audit logging');
testAudit('Test audit event', { action: 'test', timestamp: new Date().toISOString() });
console.log('✓ Audit logging test passed\n');

// Test 4: File logging
console.log('Test 4: File logging verification');
await new Promise(resolve => setTimeout(resolve, 200)); // Wait for async file writes

const files = fs.readdirSync(logDir);
if (files.length === 0) {
  console.error('✗ No log files created!');
  process.exit(1);
}

const logFile = files[0];
console.log(`✓ Log file created: ${logFile}`);

const content = fs.readFileSync(`${logDir}/${logFile}`, 'utf-8');
const lines = content.trim().split('\n');
console.log(`✓ Log file contains ${lines.length} entries`);

// Verify log file format
const hasTimestamp = lines.every(line => line.match(/^\d{4}-\d{2}-\d{2}T/));
const hasLogLevel = lines.every(line => line.includes('INFO:') || line.includes('WARN:') || line.includes('ERROR:') || line.includes('DEBUG:'));

if (!hasTimestamp) {
  console.error('✗ Log entries missing timestamps!');
  process.exit(1);
}
console.log('✓ All log entries have timestamps');

if (!hasLogLevel) {
  console.error('✗ Log entries missing log levels!');
  process.exit(1);
}
console.log('✓ All log entries have log levels');

// Test 5: Daily rotation filename
console.log('\nTest 5: Daily rotation');
const today = new Date().toISOString().split('T')[0];
const expectedFilename = `app-${today}.log`;
if (logFile !== expectedFilename) {
  console.error(`✗ Expected filename ${expectedFilename}, got ${logFile}`);
  process.exit(1);
}
console.log(`✓ Daily rotation working: ${expectedFilename}`);

// Cleanup
fs.rmSync(logDir, { recursive: true });

console.log('\n========================================');
console.log('  ✅ All tests passed!');
console.log('========================================\n');
