import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../models/api-error.model';
import { ApiErrorHandler } from './api-error-handler';
import { ApiSuccessHandler } from './api-success-handler';
import { DefaultApiErrorHandler } from './default-api-error-handler';
import { DefaultApiSuccessHandler } from './default-api-success-handler';

const apiError: ApiError = {
  type: 'about:blank',
  title: 'Server Error',
  status: 500,
  detail: 'Something went wrong.',
  timestamp: '2026-01-01T00:00:00.000Z',
};

describe('DefaultApiErrorHandler', () => {
  it('forwards the error to Angular ErrorHandler', () => {
    const handleError = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useValue: { handleError } },
        { provide: ApiErrorHandler, useClass: DefaultApiErrorHandler },
      ],
    });

    TestBed.inject(ApiErrorHandler).handle(apiError);

    expect(handleError).toHaveBeenCalledWith(apiError);
  });

  it('does not reach for any UI service', () => {
    // No UI providers at all — only Angular's real ErrorHandler, which logs.
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [{ provide: ApiErrorHandler, useClass: DefaultApiErrorHandler }],
    });

    expect(() => TestBed.inject(ApiErrorHandler).handle(apiError)).not.toThrow();

    consoleError.mockRestore();
  });
});

describe('DefaultApiSuccessHandler', () => {
  it('discards the message without throwing', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiSuccessHandler, useClass: DefaultApiSuccessHandler },
      ],
    });

    expect(() => TestBed.inject(ApiSuccessHandler).handle('Saved')).not.toThrow();
  });
});
