import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MapComponent } from './map/map.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ConfigService } from './map/config.service';
import { firstValueFrom, from, tap } from 'rxjs';

function initializeApp() {
  const http = inject(ConfigService);
  return firstValueFrom(
    from(http.loadConfig())
  );
}

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),
  provideRouter([
    { path: '', component: MapComponent }
  ]),
  provideHttpClient(withInterceptorsFromDi()),
    DatePipe,
  {
    provide: APP_INITIALIZER,
    useValue: initializeApp,
    multi: true,
  },
  ]
};
