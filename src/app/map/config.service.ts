import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    public items: any;

    constructor(private http: HttpClient) { }

    loadConfig(): Promise<void> {
        return this.http.get('/assets/config.json')
            .toPromise()
            .then(data => {
                console.log(data);
                this.items = data;
            });
    }
}