import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes'; // or app.config.ts

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
