import { TestBed } from '@angular/core/testing';
import { ApiLoadingService } from './api-loading.service';

describe('ApiLoadingService', () => {
  let service: ApiLoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiLoadingService);
  });

  it('is not loading initially', () => {
    expect(service.loading()).toBe(false);
  });

  it('is loading while at least one request is in flight', () => {
    service.start();
    expect(service.loading()).toBe(true);

    service.stop();
    expect(service.loading()).toBe(false);
  });

  it('stays loading until every concurrent request has stopped', () => {
    service.start();
    service.start();

    service.stop();
    expect(service.loading()).toBe(true);

    service.stop();
    expect(service.loading()).toBe(false);
  });

  it('does not go negative when stopped more often than started', () => {
    service.stop();
    service.stop();
    expect(service.loading()).toBe(false);

    // A single start must still flip it back on, which fails if the counter
    // was allowed to drift to -2.
    service.start();
    expect(service.loading()).toBe(true);
  });
});
