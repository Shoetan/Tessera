import { AuditService } from './audit.service.js';

// Audit rows are never edited and never deleted. That is enforced by AuditService
// having no method that could do it, so this test fails the moment one appears.
describe('AuditService', () => {
  it('has no method that could update or delete an audit entry', () => {
    const methods = Object.getOwnPropertyNames(AuditService.prototype).filter(
      (name) => name !== 'constructor',
    );

    // sanity check: we are really looking at the class's methods
    expect(methods).toContain('record');

    const mutating = methods.filter((name) =>
      /update|delete|remove|edit|upsert|destroy|purge|clear/i.test(name),
    );
    expect(mutating).toEqual([]);
  });
});
