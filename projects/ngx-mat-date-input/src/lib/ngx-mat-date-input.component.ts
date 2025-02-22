import { FocusMonitor } from '@angular/cdk/a11y'
import { coerceBooleanProperty } from '@angular/cdk/coercion'
import { NgIf } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  Optional,
  Self,
  ViewChild,
  booleanAttribute,
} from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  FormsModule,
  NgControl,
  NgForm,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { ErrorStateMatcher } from '@angular/material/core'
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker'
import {
  MatFormFieldAppearance,
  MatFormFieldControl,
  MatFormFieldModule,
} from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { Subject, takeUntil } from 'rxjs'
import { NgxMatDateInputControls } from './ngx-mat-date-input.interface'

class ngxMatDateInputBase {
  constructor(
    public _defaultErrorStateMatcher: ErrorStateMatcher,
    public _parentForm: NgForm,
    public _parentFormGroup: FormGroupDirective,
    public ngControl: NgControl,
  ) {}
}

@Component({
  selector: 'ngx-mat-date-input',
  templateUrl: './ngx-mat-date-input.component.html',
  styleUrls: ['./ngx-mat-date-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: NgxMatDateInputComponent,
    },
  ],
  imports: [
    NgIf,
    // Forms
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
})
export class NgxMatDateInputComponent extends ngxMatDateInputBase implements OnDestroy, DoCheck {
  static nextId = 0

  @ViewChild('monthInput', { static: true }) monthInput!: ElementRef
  @ViewChild('yearInput', { static: true }) yearInput!: ElementRef

  @HostBinding()
  id = `ngxMatDateInput-${NgxMatDateInputComponent.nextId++}`

  itemForm = this._createItemForm()
  controls: NgxMatDateInputControls = {
    day: this.itemForm.get('day')!,
    month: this.itemForm.get('month')!,
    year: this.itemForm.get('year')!,
  }

  today = new Date()

  @Input() autocomplete: 'on' | 'off' = 'on'
  @Input() errorStateMatcher: ErrorStateMatcher = this._defaultErrorStateMatcher
  @Input() labels: [string, string, string] = ['DD', 'MM', 'YYYY']
  @Input() placeholders: [string, string, string] = ['', '', '']
  @Input() name?: string
  @Input() appearance: MatFormFieldAppearance = 'fill'
  @Input() matDatepicker?: MatDatepicker<any>
  @Input() yearMethod: (value: string, controls: any) => void = this._yearMethod

  @Input() fields = {
    day: true,
    month: true,
    year: true,
  }

  private _min!: Date
  @Input() set min(value: Date) {
    this._min = value

    this.controls.year?.addValidators(Validators.min(value.getFullYear()))
  }
  get min(): Date {
    return this._min
  }

  private _unsubscribe$: Subject<void> = new Subject()
  private _placeholder?: string
  private _required = false
  private _disabled = false
  stateChanges = new Subject<void>()
  focused = false
  describedBy = ''
  value?: any

  private _formerValues = {
    day: '',
    month: '',
    year: '',
  }

  onTouched = () => {}

  propagateChange = (_: any) => {}

  @HostBinding('class.ngx-floating')
  get shouldLabelFloat(): boolean {
    return this.focused || !this.empty
  }

  @Input()
  get placeholder(): string {
    return this._placeholder || ''
  }

  set placeholder(value: string) {
    this._placeholder = value
    this.stateChanges.next(undefined)
  }

  @Input({ transform: booleanAttribute })
  get required(): boolean {
    return this._required
  }

  set required(value: boolean) {
    this._required = coerceBooleanProperty(value)
    this.stateChanges.next(undefined)
  }

  @Input()
  get disabled(): boolean {
    return this._disabled
  }

  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value)
    this.stateChanges.next(undefined)
  }

  private errorState?: boolean
  private _isEmpty = true

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _fm: FocusMonitor,
    private _elRef: ElementRef<HTMLElement>,
    private _formBuilder: FormBuilder,
    @Optional() @Self() _ngControl: NgControl,
    @Optional() _parentForm: NgForm,
    @Optional() _parentFormGroup: FormGroupDirective,
    _defaultErrorStateMatcher: ErrorStateMatcher,
  ) {
    super(_defaultErrorStateMatcher, _parentForm, _parentFormGroup, _ngControl)

    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this
    }

    this._subscribe()
  }

  updateErrorState() {
    if (
      this.ngControl &&
      this.ngControl.invalid &&
      (this.ngControl.touched || (this._parentForm && this._parentForm.submitted))
    ) {
      const currentState = this.errorStateMatcher.isErrorState(
        this.ngControl.control as FormControl,
        this.ngControl?.value,
      )
      if (currentState !== this.errorState) {
        this.errorState = currentState
        this._changeDetectorRef.markForCheck()
      }
    }
  }

  private _subscribe() {
    this._fm.monitor(this._elRef, true).subscribe((origin) => {
      if (this.focused && !origin) {
        this.onTouched()
      }
      this.focused = !!origin
      this.stateChanges.next()
    })

    this.itemForm.valueChanges.pipe(takeUntil(this._unsubscribe$)).subscribe((value) => {
      this._isEmpty = !value.day && !value.month && !value.year ? true : false

      if (
        value?.day?.length &&
        value.day.length >= 2 &&
        value?.month?.length &&
        value.month.length >= 2 &&
        value?.year?.length &&
        value.year.length >= 4
      ) {
        const newDate = new Date(+value.year, +value.month, +value.day, value.hour, value.minute)
        this.itemForm.patchValue(
          {
            datePicker: newDate,
          },
          { emitEvent: false },
        )

        this.propagateChange(newDate.toISOString())
        this._changeDetectorRef.markForCheck()
      }
    })

    this.itemForm
      .get('datePicker')
      ?.valueChanges.pipe(takeUntil(this._unsubscribe$))
      .subscribe((value) => {
        // @ToDo: Wont work with multiple datePicker - component instantiation
        this.controls.day?.patchValue(value.getDate().toString(), { emitEvent: false })
        this.controls.month?.patchValue((value.getMonth() + 1).toString(), { emitEvent: false })
        this.controls.year?.patchValue(value.getFullYear().toString(), { emitEvent: false })
      })

    this.itemForm
      .get('day')
      ?.valueChanges.pipe(takeUntil(this._unsubscribe$))
      .subscribe((value) => {
        if (value.includes('00')) {
          this.controls.day?.setValue(this._formerValues.day)
          return
        }
        if (!this._controlValue(value, 'day')) return

        if (+value > 31) this.controls.day?.setValue('31')
        else if (typeof value === 'number' && value < 0) this.controls.day?.setValue('01')

        if ((+value >= 10 && +value <= 31) || +value > 3 || value.length >= 2) {
          if (+value < 10 && !value.toString().includes('0'))
            this.controls.day?.setValue(`0${value}`)

          this.monthInput?.nativeElement.focus()
        }
      })

    this.itemForm
      .get('month')
      ?.valueChanges.pipe(takeUntil(this._unsubscribe$))
      .subscribe((value) => {
        if (value.includes('00')) {
          this.controls.month?.setValue(this._formerValues.month)
          return
        }
        if (!this._controlValue(value, 'month')) return

        if (+value > 12) this.controls.month?.setValue('12')
        else if (typeof value === 'number' && value < 0) this.controls.month?.setValue('01')

        if ((+value >= 2 && +value <= 12) || value.length >= 2) {
          if (+value < 10 && !value.toString().includes('0'))
            this.controls.month?.setValue(`0${value}`)

          this.yearInput?.nativeElement.focus()
        }

        this._controlDayOfMonth(value)

        if (value.length >= 2 && this.controls.year.value.length >= 4) {
          this._setDayValidator()
          this.controls.day.updateValueAndValidity()
        }
      })

    this.itemForm
      .get('year')
      ?.valueChanges.pipe(takeUntil(this._unsubscribe$))
      .subscribe((value) => {
        if (!this._controlValue(value, 'year')) return
        if (value.startsWith('0')) {
          this.controls.year?.setValue('')
        }

        this.yearMethod(value, this.controls)

        if (value.length >= 4) {
          this._setDayValidator()
          this._setMonthValidator()

          this.controls.day.updateValueAndValidity()
          this.controls.month.updateValueAndValidity()
        }
      })
  }

  private _yearMethod(value: string, controls = this.controls) {
    const currentYear = new Date().getFullYear()

    if (+value > currentYear) controls.year?.setValue(currentYear.toString())
    else if (+value < 0 || (+value > 1000 && +value < currentYear - 120)) {
      controls.year?.setValue((+currentYear - 120).toString())
    }
  }

  private _controlDayOfMonth(monthValue: string) {
    const dayValue = Number(this.controls.day.value)

    if (monthValue === '02') {
      if (dayValue > 29) {
        this.controls.day?.patchValue('29', { emitEvent: false })
      }
    } else if (['04', '06', '09', '11'].includes(monthValue)) {
      if (dayValue > 30) {
        this.controls.day?.patchValue('30', { emitEvent: false })
      }
    }
  }

  private _setDayValidator(monthValue = Number(this.controls.month.value)) {
    if (
      Number(this.controls.year.value) > this._min.getFullYear() || // If year is greater than min year
      (Number(this.controls.year.value) === this._min.getFullYear() &&
        monthValue > this._min.getMonth() + 1) // If year is equal to min year and month is greater than min month
    ) {
      this.controls.day?.clearValidators()
    } else {
      this.controls.day?.setValidators(Validators.min(this._min.getDate()))
    }
  }

  private _setMonthValidator(yearValue = Number(this.controls.year.value)) {
    if (yearValue > this._min.getFullYear()) {
      this.controls.month?.clearValidators()
    } else {
      this.controls.month?.setValidators(Validators.min(this._min.getMonth() + 1))
    }
  }

  ngDoCheck(): void {
    if (this.ngControl) {
      const oldState = this.errorState
      const newState = this.errorStateMatcher.isErrorState(this.ngControl.control, this._parentForm)

      this.errorState =
        (newState && (!this.ngControl.control?.value || this.ngControl.control?.touched)) ||
        (!this.focused ? newState : false)

      if (oldState !== newState) {
        this.errorState = newState
        this.stateChanges.next()
      }
    }
  }

  private _createItemForm(): FormGroup<{
    minute: FormControl<number>
    hour: FormControl<number>
    day: FormControl<string>
    month: FormControl<string>
    year: FormControl<string>
    datePicker: FormControl<Date>
  }> {
    return this._formBuilder.group({
      minute: new FormControl(0, { nonNullable: true }),
      hour: new FormControl(0, { nonNullable: true }),
      day: new FormControl('', { nonNullable: true }),
      month: new FormControl('', { nonNullable: true }),
      year: new FormControl('', { nonNullable: true }),
      datePicker: new FormControl(new Date(), { nonNullable: true }),
    })
  }

  private _updateItemForm(date?: string): void {
    let minute = 0
    let hour = 0
    let day = ''
    let month = ''
    let year = ''

    if (date) {
      const tempBDay = new Date(date)
      minute = tempBDay.getMinutes()
      hour = tempBDay.getHours()
      day = tempBDay.getDate().toString()
      month = (tempBDay.getMonth() + 1).toString()
      year = tempBDay.getFullYear().toString()
    }

    this.itemForm.patchValue(
      {
        minute: minute,
        hour: hour,
        day: day ? day.padStart(2, '0') : '',
        month: month ? month.padStart(2, '0') : '',
        year: year,
        datePicker: date ? new Date(date) : new Date(),
      },
      { emitEvent: false },
    )
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
    this._changeDetectorRef.markForCheck()
    this.stateChanges.next(undefined)
  }

  writeValue(value: any): void {
    this._updateItemForm(value)

    // Value is set from outside using setValue()
    this._changeDetectorRef.markForCheck()
    this.stateChanges.next(undefined)
  }
  get empty(): boolean {
    return this._isEmpty
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ')
  }

  onContainerClick(event: MouseEvent): void {
    if ((event.target as Element).tagName.toLowerCase() !== 'input') {
      // tslint:disable-next-line:no-non-null-assertion
      this._elRef.nativeElement.querySelector('input')!.focus()
    }
  }

  reset() {
    this.itemForm.reset()
    this.propagateChange(null)

    this._changeDetectorRef.markForCheck()
    this.stateChanges.next(undefined)
  }

  ngOnDestroy() {
    this.stateChanges.complete()
    this._fm.stopMonitoring(this._elRef)

    this._unsubscribe$.next()
    this._unsubscribe$.complete()
  }

  /**
   * @do Avoid being able to enter incorrect values like e, 0.3, ...
   */
  private _controlValue(value: string, target: 'day' | 'month' | 'year'): boolean {
    if (isNaN(+value) || value.includes('.')) {
      this.controls[target]?.setValue(this._formerValues[target])
      return false
    }

    this._formerValues[target] = value
    return true
  }
}
