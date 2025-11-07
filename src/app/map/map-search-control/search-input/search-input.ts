import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Optional, Output, Self, SkipSelf } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormArray, FormBuilder, FormControl, FormGroup, FormGroupDirective, FormsModule, NgControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  templateUrl: './search-input.html',
  styleUrls: ['./search-input.less'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class SearchInput implements ControlValueAccessor {
  @Input() placeholder = 'Search...';
  @Input() frmGrp!: FormGroup;
  @Output() search = new EventEmitter<{ controlName: String | number, controlValue: String }>();
  @Output() addMarker = new EventEmitter<string | number>();

  value = '';
  constructor(@Self() @Optional() public ngControl: NgControl, private fb: FormBuilder,
    @SkipSelf() @Optional() private parentFormGroup: FormGroupDirective) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  @Output() focus = new EventEmitter<FocusEvent>();

  onFocus(event: FocusEvent) {
    this.focus.emit(event);
  }

  get controlName(): [string | number, AbstractControl | null] | undefined {
    if (!this.parentFormGroup) return undefined;

    const formGroup = this.parentFormGroup.form;
    const entries = Object.entries(formGroup.controls);
    const match = entries.find(([_, control]) => control === this.ngControl.control);
    return match ? match : this.fallback();
  }

  fallback = (): [number, AbstractControl | null] | undefined => {
    return [this.frmGrp.value.i, this.ngControl.control];
  }

  private onChange = (value: any) => { };
  private onTouched = () => { };

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // optional if you want to disable the control dynamically
  }

  onSearch = (): void => {
    this.onChange(this.value);
    this.onTouched();
    this.search.emit({ controlName: this.controlName![0], controlValue: this.value });
  }

  addCurrent = (): void => {
    this.addMarker.emit(this.controlName![0]);
  }

  addLocation = (): void => {
    const control = this.controlName!;
    const formArray = (<FormArray>this.parentFormGroup.form.controls.inter);
    let frm = Number.parseInt(control[0].toString());

    if (!isNaN(frm)) {
      formArray.insert(frm + 1, this.fb.group({ input: new FormControl(), key: formArray.length, i: frm + 1 }));
      this.displace(frm + 1, formArray);
    }
    else {
      formArray.insert(0, this.fb.group({ input: new FormControl(), key: formArray.length, i: 0 }));
      this.displace(0, formArray);
    }
  }

  private displace(idx: number, formArray: FormArray<FormGroup>, offset: number = 1): void {
    for (let x = formArray.length - 1; x > idx && x >= 0; x--) {
      formArray.at(x).controls.i.setValue(formArray.at(x).value.i + offset);
    }
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (this.value === target.value) return;
    this.value = target.value;
    this.onChange(this.value);
  }

  threshold = 0.4; // 40% of element width

  private startPosition: number = 0;
}
