import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import * as atlas from 'azure-maps-control';

@Component({
  selector: 'app-map-layer-view',
  templateUrl: './map-layer-view.html',
  styleUrl: './map-layer-view.less',
  standalone: true,
  imports: [CommonModule]
})
export class MapLayerView implements OnInit {
  @Input("map") map!: atlas.Map;
  layers: atlas.layer.Layer[] = [];
  layerActivity: Map<string, boolean> = new Map<string, boolean>();

  ngOnInit(): void {
    this.layers = this.map.layers.getLayers();

    for (let layer of this.layers) {
      this.layerActivity.set(layer.getId(), true);
    }

    this.map.events.add('layeradded', (ev) => {
      if (ev.metadata?.myAction) {
        ev.metadata.myAction = undefined;
        return;
      }
      if (!this.layers.find(l => l.getId() == ev.getId()))
        this.layers.push(ev);
      this.layerActivity.set(ev.getId(), true);
    });

    this.map.events.add('layerremoved', (ev) => {
      if (ev.metadata?.myAction) {
        ev.metadata.myAction = undefined;
        return;
      }
      this.layers.splice(this.layers.findIndex(l => l.getId() == ev.getId()), 1);
      this.layerActivity.delete(ev.getId());
    });
  }

  toggle(layerId: string) {
    let layer = this.map.layers.getLayerById(layerId);
    if (layer && this.layerActivity.get(layerId)) {
      layer.metadata = {
        ...layer.metadata,
        myAction: true
      }
      this.map.layers.remove(layer);
      this.layerActivity.set(layerId, false);
    } else {
      layer = this.layers.find(l => l.getId() == layerId)!;
      layer.metadata = {
        ...layer.metadata,
        myAction: true
      }
      this.map.layers.add(layer);
      this.layerActivity.set(layerId, true);
    }
  }
}
