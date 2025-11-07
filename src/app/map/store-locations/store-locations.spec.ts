import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreLocations } from './store-locations';

describe('StoreLocations', () => {
  let component: StoreLocations;
  let fixture: ComponentFixture<StoreLocations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreLocations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StoreLocations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
