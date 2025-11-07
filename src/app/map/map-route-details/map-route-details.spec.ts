import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapRouteDetails } from './map-route-details';

describe('MapRouteDetails', () => {
  let component: MapRouteDetails;
  let fixture: ComponentFixture<MapRouteDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapRouteDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapRouteDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
