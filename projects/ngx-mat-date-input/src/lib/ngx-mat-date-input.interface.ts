import { AbstractControl } from '@angular/forms'

export interface NgxMatDateInputControls {
  day: AbstractControl<string, string>
  month: AbstractControl<string, string>
  year: AbstractControl<string, string>
}
