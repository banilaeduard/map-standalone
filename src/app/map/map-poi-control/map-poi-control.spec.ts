import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapPoiControl } from './map-poi-control';

describe('MapPoiControl', () => {
  let component: MapPoiControl;
  let fixture: ComponentFixture<MapPoiControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapPoiControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapPoiControl);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
