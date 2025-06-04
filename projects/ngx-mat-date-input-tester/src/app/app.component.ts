import { Component } from '@angular/core'
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { NgxMatDateInputComponent } from '../../../ngx-mat-date-input/src/lib/ngx-mat-date-input.component'

@Component({
  selector: 'app-root',
  styleUrl: './app.component.css',
  templateUrl: './app.component.html',
  imports: [
    // Forms
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,

    // Mat
    MatIconModule,
    MatButtonModule,

    // Vendors
    NgxMatDateInputComponent,
  ],
})
export class AppComponent {
  filledDateForm = this._formBuilder.group({
    date: [new Date(), [Validators.max]],
  })

  emptyDateForm = this._formBuilder.group({
    date: ['', [Validators.max]],
  })

  today = new Date()

  constructor(private _formBuilder: FormBuilder) {}
}
