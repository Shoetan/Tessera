import { Test, TestingModule } from '@nestjs/testing';
import { PersonsService } from './persons.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePersonDto } from './persons.dto.js';
import { validateVerhoeffCheckDigit } from './national-id/verhoeff.js';
import { PersonNotFoundException } from '../common/exceptions/person-not-found.exception.js';
import { Prisma } from '../generated/prisma/client.js';

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
  };

  const dto: CreatePersonDto = {
    givenName: 'Ada',
    familyName: 'Okafor',
    dateOfBirth: new Date('1990-05-14'),
    gender: 'female',
  };

  beforeEach(async () => {
    fakePrisma = { person: { create: vi.fn(), findUnique: vi.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonsService,
        // anyone asking for PrismaService gets the fake instead
        { provide: PrismaService, useValue: fakePrisma },
      ],
    }).compile();

    service = module.get<PersonsService>(PersonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registerPerson saves a server-generated, valid 12-digit national ID', async () => {
    await service.registerPerson(dto);

    const { data } = fakePrisma.person.create.mock.calls[0][0];
    expect(data.nationalId).toMatch(/^[2-9][0-9]{11}$/);
    expect(validateVerhoeffCheckDigit(data.nationalId)).toBe(true);
  });

  it('registerPerson turns the date of birth text into a real Date', async () => {
    await service.registerPerson(dto);

    const { data } = fakePrisma.person.create.mock.calls[0][0];
    expect(data.dateOfBirth).toBeInstanceOf(Date);
    expect(data.dateOfBirth.toISOString()).toBe('1990-05-14T00:00:00.000Z');
  });

  it('registerPerson returns the person the database saved', async () => {
    const saved = { id: 'some-uuid', nationalId: '234567890124', ...dto };
    fakePrisma.person.create.mockResolvedValue(saved);

    expect(await service.registerPerson(dto)).toBe(saved);
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

    expect(await service.registerPerson(dto)).toBe(saved);

    expect(fakePrisma.person.create).toHaveBeenCalledTimes(2);
    const firstId = fakePrisma.person.create.mock.calls[0][0].data.nationalId;
    const secondId = fakePrisma.person.create.mock.calls[1][0].data.nationalId;
    expect(secondId).not.toBe(firstId);
  });

  it('registerPerson gives up after 3 taken IDs instead of looping forever', async () => {
    fakePrisma.person.create.mockRejectedValue(takenError());

    await expect(service.registerPerson(dto)).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect(fakePrisma.person.create).toHaveBeenCalledTimes(3);
  });

  it('registerPerson does not retry errors that are not collisions', async () => {
    fakePrisma.person.create.mockRejectedValue(new Error('connection refused'));

    await expect(service.registerPerson(dto)).rejects.toThrow('connection refused');
    expect(fakePrisma.person.create).toHaveBeenCalledTimes(1);
  });

  it('findPersonById returns the person the database found', async () => {
    const found = { id: 'some-uuid', ...dto };
    fakePrisma.person.findUnique.mockResolvedValue(found);

    expect(await service.findPersonById('some-uuid')).toBe(found);
  });
});
