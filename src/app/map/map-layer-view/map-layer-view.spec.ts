import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLayerView } from './map-layer-view';

describe('MapLayerView', () => {
  let component: MapLayerView;
  let fixture: ComponentFixture<MapLayerView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapLayerView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapLayerView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
