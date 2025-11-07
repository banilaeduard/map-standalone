import { ApplicationRef, ComponentFactoryResolver, ComponentRef, EmbeddedViewRef, Injectable, Injector, Renderer2, RendererFactory2, Type } from "@angular/core";
import * as atlas from "azure-maps-control";
import { MapHelper } from "./map-helper";
import { RouteHelperService } from "./route-helper.service";

@Injectable({
    providedIn: 'root'
})
export class MapControl extends atlas.control.ControlBase<atlas.internal.EventArgs> {
    private renderer: Renderer2;
    private element?: HTMLElement;
    private topLeftContainer: HTMLElement;
    private ul: HTMLUListElement;
    private componentMap: Map<string, ComponentRef<any>>;
    private componentInjector: Map<string, { name: string, type: Type<any>, inputs: any }>;
    private currentInstance: ComponentRef<any> | undefined;

    constructor(rendererFactory: RendererFactory2,
        private mapHelper: MapHelper,
        private routeHelper: RouteHelperService,
        private injector: Injector,
        private appRef: ApplicationRef,
        private cfr: ComponentFactoryResolver
    ) {
        super();
        this.renderer = rendererFactory.createRenderer(null, null);
        this.topLeftContainer = this.renderer.createElement('div') as HTMLDivElement;
        this.renderer.setStyle(this.topLeftContainer, 'position', 'absolute');
        this.renderer.setStyle(this.topLeftContainer, 'top', '0.5em');
        this.renderer.setStyle(this.topLeftContainer, 'left', '1em');
        this.renderer.setStyle(this.topLeftContainer, 'z-index', '10000');
        this.renderer.setProperty(this.topLeftContainer, 'background-color', 'antiquewhite');
        this.renderer.setStyle(this.topLeftContainer, 'pointerEvents', 'auto');

        this.ul = this.renderer.createElement('ul') as HTMLUListElement;
        this.renderer.setStyle(this.ul, 'list-style', 'none');
        this.renderer.setStyle(this.ul, 'padding', '0');
        this.renderer.setStyle(this.ul, 'margin', '0');
        this.renderer.addClass(this.ul, 'pretty-list');

        this.componentMap = new Map<string, ComponentRef<any>>();
        this.componentInjector = new Map<string, { name: string, type: Type<any>, inputs: any }>();
    }

    onAdd(map: atlas.Map, options?: atlas.ControlOptions): HTMLElement {
        map.getMapContainer().appendChild(this.topLeftContainer);

        this.element = this.renderer.createElement('div');
        this.renderer.setStyle(this.element, 'display', 'inline-block');
        this.renderer.setStyle(this.element, 'background', '#e0e0e0');
        this.renderer.setStyle(this.element, 'padding', '8px');
        this.renderer.setStyle(this.element, 'z-index', '999999');
        this.renderer.setStyle(this.element, 'cursor', 'pointer');
        this.renderer.setStyle(this.element, 'pointerEvents', 'auto');

        this.clearElement(this.ul);
        for (const opt of (options as any).options as { name: string, type: Type<any>, inputs: any }[]) {
            const li = this.renderer.createElement('li') as HTMLLIElement;
            const button = this.renderer.createElement('button');
            this.renderer.appendChild(li, button);
            this.renderer.setProperty(li, 'innerText', opt.name);

            // Hover effect
            this.renderer.listen(li, 'mouseenter', () => {
                this.renderer.setStyle(li, 'background', '#f0f0f0');
            });
            this.renderer.listen(li, 'mouseleave', () => {
                this.renderer.setStyle(li, 'background', '#fff');
            });

            this.componentInjector.set(opt.name, opt);
            this.renderer.listen(li, 'click', () => {
                this.open(opt.name);
            });

            this.renderer.appendChild(this.ul, li);
        }

        var actions = this.createControlElement('Actions');
        var center = this.createControlElement('Center');

        this.renderer.listen(actions, 'click', (el) => {
            console.log(el);
            this.clearElement(this.topLeftContainer);
            this.renderer.appendChild(this.topLeftContainer, this.ul);
        });

        this.renderer.listen(center, 'click', (el) => {
            if (this.routeHelper.interval) {
                this.routeHelper.stopFollowingCurrentLocation();
                this.renderer.setProperty(center, 'innerText', 'Center');
            } else {
                this.routeHelper.followCurrentLocation(map);
                this.renderer.setProperty(center, 'innerText', 'Stop following');
            }
        });

        return this.element!;
    }

    private createControlElement(name: string) {
        var action = this.renderer.createElement('button');
        this.renderer.setProperty(action, "innerText", name);
        this.renderer.setStyle(action, 'display', 'block');
        this.renderer.addClass(action, 'info');
        this.renderer.appendChild(this.element, action);
        return action;
    }

   override onRemove(): void {
        this.clearElement(this.topLeftContainer);
        this.clearElement(this.ul);
        this.componentInjector.clear();
        for (const cRef of this.componentMap) {
            this.appRef.detachView(cRef[1].hostView);
            cRef[1].destroy();
        }
        this.componentMap.clear();
        console.log('onremove map control');
    }

   override buildContainer<K extends keyof HTMLElementTagNameMap = "div">(map: atlas.Map, style: atlas.ControlStyle, ariaLabel?: string, tagName?: K): HTMLElementTagNameMap[K] {
        return null as any;
    }

   override _addEventListener(eventType: unknown, callback: unknown, once: unknown): void {
        throw new Error("Method not implemented.");
    }
   override _removeEventListener(eventType: unknown, callback: unknown): void {
        throw new Error("Method not implemented.");
    }
   override _invokeEvent<K extends string | number>(eventType: K, eventData: atlas.internal.EventArgs[K]): void {
        throw new Error("Method not implemented.");
    }

    open<T>(componentName: string, inputs: Partial<T> | undefined = undefined): ComponentRef<T> {
        let compRef: ComponentRef<T>;
        const componentOpts = this.componentInjector.get(componentName)!;
        if (this.componentMap.has(componentName)) {
            compRef = this.componentMap.get(componentName)!;
            if (inputs || componentOpts.inputs) {
                Object.assign(compRef.instance as any, componentOpts.inputs, inputs); // pass input values
            }
            let instance = compRef.instance as any;
            if (instance.initComponent)
                instance.initComponent();
        } else {
            const factory = this.cfr.resolveComponentFactory(componentOpts.type);
            compRef = factory.create(this.injector);
            let instance = compRef.instance as any;
            if (inputs || componentOpts.inputs) {
                Object.assign(compRef.instance as any, componentOpts.inputs, inputs); // pass input values
            }
            if (instance.initComponent)
                instance.initComponent();
            this.componentMap.set(componentName, compRef);
            this.appRef.attachView(compRef.hostView);
        }
        const domElem = (compRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
        if (this.currentInstance)
            this.close(this.currentInstance);
        else this.clearElement(this.topLeftContainer);
        this.currentInstance = compRef;
        this.renderer.appendChild(this.topLeftContainer, domElem);
        return compRef;
    }

    open2<T>(componentType: Type<T>, inputs: Partial<T> | undefined = undefined, container: any = undefined): ComponentRef<T> {
        return this.mapHelper.open2(componentType, inputs, container ?? this.topLeftContainer);
    }

    close<T>(compRef: ComponentRef<T>) {
        //this.appRef.detachView(compRef.hostView);
        const cRef = compRef.instance as any;
        if (cRef.reset) {
            cRef.reset();
        }
        this.clearElement(this.topLeftContainer);
        //compRef.destroy();
    }

    clearElement(el: HTMLElement) {
        this.renderer.setProperty(el, 'innerHTML', '');
    }
}