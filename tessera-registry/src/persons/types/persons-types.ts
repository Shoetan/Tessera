export interface Gender {
  male: 'male';
  female: 'female';
  other: 'other';
}

export interface PersonStatus {
  active: 'active';
  inactive: 'inactive';
}

export interface AuditAction {
  create: 'create';
  update: 'update';
  deactivate: 'deactivate';
}