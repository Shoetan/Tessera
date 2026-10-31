import { Test, TestingModule } from '@nestjs/testing';
import { PersonsService } from './persons.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePersonDto } from './persons.dto.js';
import { validateVerhoeffCheckDigit } from './national-id/verhoeff.js';
import { PersonNotFoundException } from '../common/exceptions/person-not-found.exception.js';
import { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';

// the error Prisma throws when a UNIQUE value is already taken (measured against the test database)
function takenError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('PersonsService', () => {
  let service: PersonsService;
  // a fake database: create is a spy that remembers what it was called with
  let fakePrisma: {
    person: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  // a fake audit store: record is a spy, so a test can ask what it was called with
  let fakeAudit: { record: ReturnType<typeof vi.fn> };

  const dto: CreatePersonDto = {
    givenName: 'Ada',
    familyName: 'Okafor',
    dateOfBirth: new Date('1990-05-14'),
    gender: 'female',
  };

  beforeEach(async () => {
    // like a real database, create hands back what it saved, plus an id
    const create = vi.fn(async ({ data }) => ({ id: 'some-uuid', ...data }));
    fakePrisma = { person: { create, findUnique: vi.fn() }, $transaction: vi.fn() };
    // the fake transaction just runs the callback, handing in the fake database as tx
    fakePrisma.$transaction.mockImplementation((callback) => callback(fakePrisma));
    fakeAudit = { record: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonsService,
        // anyone asking for PrismaService gets the fake instead
        { provide: PrismaService, useValue: fakePrisma },
        // and anyone asking for AuditService gets the fake audit store
        { provide: AuditService, useValue: fakeAudit },
      ],
    }).compile();

    service = module.get<PersonsService>(PersonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registerPerson saves a server-generated, valid 12-digit national ID', async () => {
    await service.registerPerson(dto, 'test-actor');

    const { data } = fakePrisma.person.create.mock.calls[0][0];
    expect(data.nationalId).toMatch(/^[2-9][0-9]{11}$/);
    expect(validateVerhoeffCheckDigit(data.nationalId)).toBe(true);
  });

  it('registerPerson turns the date of birth text into a real Date', async () => {
    await service.registerPerson(dto, 'test-actor');

    const { data } = fakePrisma.person.create.mock.calls[0][0];
    expect(data.dateOfBirth).toBeInstanceOf(Date);
    expect(data.dateOfBirth.toISOString()).toBe('1990-05-14T00:00:00.000Z');
  });

  it('registerPerson returns the person the database saved', async () => {
    const saved = { id: 'some-uuid', nationalId: '234567890124', ...dto };
    fakePrisma.person.create.mockResolvedValue(saved);

    expect(await service.registerPerson(dto, 'test-actor')).toBe(saved);
  });

  it('findPersonById throws PersonNotFoundException when no person has that id', async () => {
    // findUnique does not throw when nothing matches; it returns null
    fakePrisma.person.findUnique.mockResolvedValue(null);

    await expect(service.findPersonById('no-such-id')).rejects.toBeInstanceOf(
      PersonNotFoundException,
    );
  });

  it('registerPerson retries with a fresh national ID when the first one is taken', async () => {
    const saved = { id: 'some-uuid', ...dto };
    fakePrisma.person.create
      .mockRejectedValueOnce(takenError())
      .mockResolvedValueOnce(saved);

    expect(await service.registerPerson(dto, 'test-actor')).toBe(saved);

    expect(fakePrisma.person.create).toHaveBeenCalledTimes(2);
    const firstId = fakePrisma.person.create.mock.calls[0][0].data.nationalId;
    const secondId = fakePrisma.person.create.mock.calls[1][0].data.nationalId;
    expect(secondId).not.toBe(firstId);
  });

  it('registerPerson gives up after 3 taken IDs instead of looping forever', async () => {
    fakePrisma.person.create.mockRejectedValue(takenError());

    await expect(service.registerPerson(dto, 'test-actor')).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect(fakePrisma.person.create).toHaveBeenCalledTimes(3);
  });

  it('registerPerson does not retry errors that are not collisions', async () => {
    fakePrisma.person.create.mockRejectedValue(new Error('connection refused'));

    await expect(service.registerPerson(dto, 'test-actor')).rejects.toThrow('connection refused');
    expect(fakePrisma.person.create).toHaveBeenCalledTimes(1);
  });

  it('findPersonById returns the person the database found', async () => {
    const found = { id: 'some-uuid', ...dto };
    fakePrisma.person.findUnique.mockResolvedValue(found);

    expect(await service.findPersonById('some-uuid')).toBe(found);
  });

  it('registerPerson records a created audit entry for the new person, naming the actor', async () => {
    await service.registerPerson(dto, 'test-actor');

    expect(fakeAudit.record).toHaveBeenCalledTimes(1);
    // record(tx, entry): [0] is the transaction handle, [1] is the entry
    const entry = fakeAudit.record.mock.calls[0][1];
    expect(entry.action).toBe('created');
    expect(entry.personId).toBe('some-uuid');
    expect(entry.actor).toBe('test-actor');
  });
});
