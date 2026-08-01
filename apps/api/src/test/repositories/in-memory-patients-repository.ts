import { PaginatedResult } from '../../core/pagination/paginated-result';
import {
  FindManyPatientsParams,
  PatientsRepository,
} from '../../modules/patients/application/repositories/patients-repository';
import { Patient } from '../../modules/patients/enterprise/entities/patient';

export class InMemoryPatientsRepository implements PatientsRepository {
  public items: Patient[] = [];

  findById(id: string): Promise<Patient | null> {
    const patient = this.items.find((item) => item.id.toValue() === id);

    return Promise.resolve(patient ?? null);
  }

  findMany({
    page,
    perPage,
  }: FindManyPatientsParams): Promise<PaginatedResult<Patient>> {
    const start = (page - 1) * perPage;

    return Promise.resolve({
      items: this.items.slice(start, start + perPage),
      total: this.items.length,
      page,
      perPage,
    });
  }

  create(patient: Patient): Promise<Patient> {
    this.items.push(patient);

    return Promise.resolve(patient);
  }

  save(patient: Patient): Promise<Patient> {
    const index = this.items.findIndex(
      (item) => item.id.toValue() === patient.id.toValue(),
    );

    if (index >= 0) {
      this.items[index] = patient;
    }

    return Promise.resolve(patient);
  }

  delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id.toValue() !== id);

    return Promise.resolve();
  }
}
