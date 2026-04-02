var J=Object.defineProperty;var P=(U,t)=>{for(var e in t)J(U,e,{get:t[e],enumerable:!0})};var H={};P(H,{LocationsSettingsTab:()=>T});import"./../../ui/kit/kit.js";import*as j from"./../../core/common/common.js";import*as V from"./../../core/i18n/i18n.js";import*as M from"./../../core/sdk/sdk.js";import*as R from"./../../ui/components/buttons/buttons.js";import*as w from"./../../ui/legacy/legacy.js";import*as K from"./../../ui/visual_logging/visual_logging.js";var A=`.add-locations-button{margin-bottom:var(--sys-size-5);border:none}.locations-list{margin-top:var(--sys-size-3);flex:auto}.locations-list-item{padding:3px 6px;height:30px;display:flex;align-items:center;position:relative;flex:auto 1 1}.locations-list-text{white-space:nowrap;text-overflow:ellipsis;flex-basis:170px;user-select:none;color:var(--sys-color-on-surface);position:relative;overflow:hidden}.locations-list-title{text-align:start}.locations-list-title-text{overflow:hidden;flex:auto;white-space:nowrap;text-overflow:ellipsis}.locations-list-separator{flex:0 0 1px;background-color:var(--sys-color-divider);height:30px;margin:0 4px}.locations-list-separator-invisible{visibility:hidden;height:100%!important}.locations-edit-row{display:flex;flex-direction:row;margin:6px 5px}.locations-edit-row input{width:100%;text-align:inherit}.locations-input-container{padding:1px}.settings-card-container-wrapper{scrollbar-gutter:stable;padding:var(--sys-size-8) 0;overflow:auto;position:absolute;inset:var(--sys-size-8) 0 0}.settings-card-container{display:flex;flex-direction:column;align-items:center;gap:var(--sys-size-9)}
/*# sourceURL=${import.meta.resolve("./locationsSettingsTab.css")} */`;var c={locations:"Locations",locationName:"Location name",lat:"Lat",long:"Long",timezoneId:"Timezone ID",locale:"Locale",latitude:"Latitude",longitude:"Longitude",accuracy:"Accuracy",locationNameCannotBeEmpty:"Location name cannot be empty",locationNameMustBeLessThanS:"Location name must be less than {PH1} characters",latitudeMustBeANumber:"Latitude must be a number",latitudeMustBeGreaterThanOrEqual:"Latitude must be greater than or equal to {PH1}",latitudeMustBeLessThanOrEqualToS:"Latitude must be less than or equal to {PH1}",longitudeMustBeANumber:"Longitude must be a number",longitudeMustBeGreaterThanOr:"Longitude must be greater than or equal to {PH1}",longitudeMustBeLessThanOrEqualTo:"Longitude must be less than or equal to {PH1}",timezoneIdMustContainAlphabetic:"Timezone ID must contain alphabetic characters",localeMustContainAlphabetic:"Locale must contain alphabetic characters",accuracyMustBeANumber:"Accuracy must be a number",accuracyMustBeGreaterThanOrEqual:"Accuracy must be greater than or equal to {PH1}",addLocation:"Add location"},Q=V.i18n.registerUIStrings("panels/sensors/LocationsSettingsTab.ts",c),u=V.i18n.getLocalizedString.bind(void 0,Q),T=class extends w.Widget.VBox{list;customSetting;editor;constructor(){super({jslog:`${K.pane("emulation-locations")}`,useShadowDom:!0}),this.registerRequiredCSS(A);let t=this.contentElement.createChild("div","settings-card-container-wrapper").createChild("div");t.classList.add("settings-card-container");let e=t.createChild("devtools-card");e.heading=u(c.locations);let i=e.createChild("div");this.list=new w.ListWidget.ListWidget(this,void 0,!0),this.list.element.classList.add("locations-list"),this.list.registerRequiredCSS(A),this.list.show(i),this.customSetting=j.Settings.Settings.instance().moduleSetting("emulation.locations");let a=this.customSetting.get().map(n=>o(n,this.customSetting.defaultValue));function o(n,v){if(!n.title){let y=v.find(O=>O.lat===n.lat&&O.long===n.long&&O.timezoneId===n.timezoneId&&O.locale===n.locale);if(!y)console.error("Could not determine a location setting title");else return y}return n}let r=new R.Button.Button;r.classList.add("add-locations-button"),r.data={variant:"outlined",iconName:"plus",jslogContext:"emulation.add-location"},r.textContent=u(c.addLocation),r.addEventListener("click",()=>this.addButtonClicked()),e.append(r),this.customSetting.set(a),this.customSetting.addChangeListener(this.locationsUpdated,this)}wasShown(){super.wasShown(),this.locationsUpdated()}locationsUpdated(){this.list.clear();let t=this.customSetting.get();for(let e of t)this.list.appendItem(e,!0);this.list.appendSeparator()}addButtonClicked(){this.list.addNewItem(this.customSetting.get().length,{title:"",lat:0,long:0,timezoneId:"",locale:"",accuracy:M.EmulationModel.Location.DEFAULT_ACCURACY})}renderItem(t,e){let i=document.createElement("div");i.role="row",i.classList.add("locations-list-item");let a=i.createChild("div","locations-list-text locations-list-title");a.role="cell";let o=a.createChild("div","locations-list-title-text");o.textContent=t.title,w.Tooltip.Tooltip.install(o,t.title),i.createChild("div","locations-list-separator");let r=i.createChild("div","locations-list-text");r.textContent=String(t.lat),r.role="cell",i.createChild("div","locations-list-separator");let n=i.createChild("div","locations-list-text");n.textContent=String(t.long),n.role="cell",i.createChild("div","locations-list-separator");let v=i.createChild("div","locations-list-text");v.textContent=t.timezoneId,v.role="cell",i.createChild("div","locations-list-separator");let y=i.createChild("div","locations-list-text");return y.textContent=t.locale,y.role="cell",i.createChild("div","locations-list-separator"),i.createChild("div","locations-list-text").textContent=String(t.accuracy||M.EmulationModel.Location.DEFAULT_ACCURACY),i}removeItemRequested(t,e){let i=this.customSetting.get();i.splice(e,1),this.customSetting.set(i)}commitEdit(t,e,i){t.title=e.control("title").value.trim();let a=e.control("lat").value.trim();t.lat=a?parseFloat(a):0;let o=e.control("long").value.trim();t.long=o?parseFloat(o):0;let r=e.control("timezone-id").value.trim();t.timezoneId=r;let n=e.control("locale").value.trim();t.locale=n;let v=e.control("accuracy").value.trim();t.accuracy=v?parseFloat(v):M.EmulationModel.Location.DEFAULT_ACCURACY;let y=this.customSetting.get();i&&y.push(t),this.customSetting.set(y)}beginEdit(t){let e=this.createEditor();return e.control("title").value=t.title,e.control("lat").value=String(t.lat),e.control("long").value=String(t.long),e.control("timezone-id").value=t.timezoneId,e.control("locale").value=t.locale,e.control("accuracy").value=String(t.accuracy||M.EmulationModel.Location.DEFAULT_ACCURACY),e}createEditor(){if(this.editor)return this.editor;let t=new w.ListWidget.Editor;this.editor=t;let e=t.contentElement(),i=e.createChild("div","locations-edit-row");i.createChild("div","locations-list-text locations-list-title").textContent=u(c.locationName),i.createChild("div","locations-list-separator locations-list-separator-invisible"),i.createChild("div","locations-list-text").textContent=u(c.lat),i.createChild("div","locations-list-separator locations-list-separator-invisible"),i.createChild("div","locations-list-text").textContent=u(c.long),i.createChild("div","locations-list-separator locations-list-separator-invisible"),i.createChild("div","locations-list-text").textContent=u(c.timezoneId),i.createChild("div","locations-list-separator locations-list-separator-invisible"),i.createChild("div","locations-list-text").textContent=u(c.locale),i.createChild("div","locations-list-separator locations-list-separator-invisible"),i.createChild("div","locations-list-text").textContent=u(c.accuracy);let a=e.createChild("div","locations-edit-row");a.createChild("div","locations-list-text locations-list-title locations-input-container").appendChild(t.createInput("title","text",u(c.locationName),r)),a.createChild("div","locations-list-separator locations-list-separator-invisible");let o=a.createChild("div","locations-list-text locations-input-container");return o.appendChild(t.createInput("lat","text",u(c.latitude),n)),a.createChild("div","locations-list-separator locations-list-separator-invisible"),o=a.createChild("div","locations-list-text locations-list-text-longitude locations-input-container"),o.appendChild(t.createInput("long","text",u(c.longitude),v)),a.createChild("div","locations-list-separator locations-list-separator-invisible"),o=a.createChild("div","locations-list-text locations-input-container"),o.appendChild(t.createInput("timezone-id","text",u(c.timezoneId),y)),a.createChild("div","locations-list-separator locations-list-separator-invisible"),o=a.createChild("div","locations-list-text locations-input-container"),o.appendChild(t.createInput("locale","text",u(c.locale),O)),a.createChild("div","locations-list-separator locations-list-separator-invisible"),o=a.createChild("div","locations-list-text locations-input-container"),o.appendChild(t.createInput("accuracy","text",u(c.accuracy),Z)),t;function r($,D,b){let S=b.value.trim(),p;return S.length?S.length>50&&(p=u(c.locationNameMustBeLessThanS,{PH1:50})):p=u(c.locationNameCannotBeEmpty),p?{valid:!1,errorMessage:p}:{valid:!0}}function n($,D,b){let p=b.value.trim(),I=Number(p);if(!p)return{valid:!0};let x;return Number.isNaN(I)?x=u(c.latitudeMustBeANumber):parseFloat(p)<-90?x=u(c.latitudeMustBeGreaterThanOrEqual,{PH1:-90}):parseFloat(p)>90&&(x=u(c.latitudeMustBeLessThanOrEqualToS,{PH1:90})),x?{valid:!1,errorMessage:x}:{valid:!0}}function v($,D,b){let p=b.value.trim(),I=Number(p);if(!p)return{valid:!0};let x;return Number.isNaN(I)?x=u(c.longitudeMustBeANumber):parseFloat(p)<-180?x=u(c.longitudeMustBeGreaterThanOr,{PH1:-180}):parseFloat(p)>180&&(x=u(c.longitudeMustBeLessThanOrEqualTo,{PH1:180})),x?{valid:!1,errorMessage:x}:{valid:!0}}function y($,D,b){let E=b.value.trim();return E===""||/[a-zA-Z]/.test(E)?{valid:!0}:{valid:!1,errorMessage:u(c.timezoneIdMustContainAlphabetic)}}function O($,D,b){let E=b.value.trim();return E===""||/[a-zA-Z]{2}/.test(E)?{valid:!0}:{valid:!1,errorMessage:u(c.localeMustContainAlphabetic)}}function Z($,D,b){let S=b.value.trim(),p=Number(S);if(!S)return{valid:!0};let I;return Number.isNaN(p)?I=u(c.accuracyMustBeANumber):parseFloat(S)<0&&(I=u(c.accuracyMustBeGreaterThanOrEqual,{PH1:0})),I?{valid:!1,errorMessage:I}:{valid:!0}}}};var X={};P(X,{NonPresetOptions:()=>h,PressureOptions:()=>et,SensorsView:()=>B,ShiftDragOrientationSpeed:()=>W,ShowActionDelegate:()=>F});import*as L from"./../../core/common/common.js";import*as Y from"./../../core/host/host.js";import*as N from"./../../core/i18n/i18n.js";import*as m from"./../../core/sdk/sdk.js";import*as C from"./../../models/geometry/geometry.js";import"./../../ui/components/buttons/buttons.js";import*as z from"./../../ui/legacy/components/settings_ui/settings_ui.js";import*as f from"./../../ui/legacy/legacy.js";import{Directives as g,html as k,render as q}from"./../../ui/lit/lit.js";import*as d from"./../../ui/visual_logging/visual_logging.js";import*as G from"./../mobile_throttling/mobile_throttling.js";var _=`.sensors-view{padding:12px;display:block}.sensors-view input{width:100%;max-width:120px;margin:-5px 10px 0 0;text-align:end}.sensors-view input[readonly]{background-color:var(--sys-color-neutral-container)}.sensors-view fieldset{border:none;padding:10px 0;flex:0 0 auto;margin:0}.sensors-view fieldset[disabled]{opacity:50%}.orientation-axis-input-container input{max-width:120px}.concurrency-details{margin:var(--sys-size-5) var(--sys-size-10);display:flex;align-items:center}.concurrency-details input{width:50px;margin:0}.concurrency-hidden{visibility:hidden}.sensors-view input:focus::-webkit-input-placeholder{color:transparent!important}.sensors-view select{width:200px}.sensors-group-title{width:80px;line-height:24px}.sensors-group{display:flex;flex-wrap:wrap;margin-bottom:10px}.manage-locations{margin-left:var(--sys-size-4)}.geo-fields{flex:2 0 200px}.latlong-group{display:flex;margin-bottom:10px}.latlong-title{width:70px}.timezone-error,
.locale-error{margin-left:10px;color:var(--legacy-input-validation-error)}.orientation-content{display:flex;flex-wrap:wrap}.orientation-fields{margin-right:10px}.orientation-stage{--override-gradient-color-1:var(--ref-palette-cyan95);--override-gradient-color-2:var(--ref-palette-cyan90);perspective:700px;perspective-origin:50% 50%;width:160px;height:150px;background:linear-gradient(var(--override-gradient-color-1) 0%,var(--override-gradient-color-1) 64%,var(--override-gradient-color-2) 64%,var(--override-gradient-color-1) 100%);transition:0.2s ease opacity,0.2s ease filter;overflow:hidden;margin-bottom:10px}.theme-with-dark-background .orientation-stage,
:host-context(.theme-with-dark-background) .orientation-stage{--override-gradient-color-1:var(--ref-palette-cyan10);--override-gradient-color-2:var(--ref-palette-cyan30)}.orientation-stage.disabled{filter:grayscale();opacity:50%}.orientation-element,
.orientation-element::before,
.orientation-element::after{position:absolute;box-sizing:border-box;transform-style:preserve-3d;background:no-repeat;background-size:cover;backface-visibility:hidden}.orientation-box{width:62px;height:122px;inset:0;margin:auto;transform:rotate3d(1,0,0,90deg)}.orientation-layer{width:100%;height:100%;transform-style:preserve-3d}.orientation-box.is-animating,
.is-animating .orientation-layer{transition:transform 300ms cubic-bezier(0.4,0,0.2,1) 0ms}.orientation-front,
.orientation-back{width:62px;height:122px;border-radius:8px}.orientation-front{background-image:var(--image-file-accelerometer-front)}.orientation-back{transform:rotateY(180deg) translateZ(8px);background-image:var(--image-file-accelerometer-back)}.orientation-left,
.orientation-right{width:8px;height:106px;top:8px;background-position:center center}.orientation-left{left:-8px;transform-origin:right center;transform:rotateY(-90deg);background-image:var(--image-file-accelerometer-left)}.orientation-right{right:-8px;transform-origin:left center;transform:rotateY(90deg);background-image:var(--image-file-accelerometer-right)}.orientation-left::before,
.orientation-left::after,
.orientation-right::before,
.orientation-right::after{content:"";width:8px;height:6px}.orientation-left::before,
.orientation-left::after{background-image:var(--image-file-accelerometer-left)}.orientation-right::before,
.orientation-right::after{background-image:var(--image-file-accelerometer-right)}.orientation-left::before,
.orientation-right::before{top:-6px;transform-origin:center bottom;transform:rotateX(26deg);background-position:center top}.orientation-left::after,
.orientation-right::after{bottom:-6px;transform-origin:center top;transform:rotateX(-25deg);background-position:center bottom}.orientation-top,
.orientation-bottom{width:50px;height:8px;left:8px;background-position:center center}.orientation-top{top:-8px;transform-origin:center bottom;transform:rotateX(90deg);background-image:var(--image-file-accelerometer-top)}.orientation-bottom{bottom:-8px;transform-origin:center top;transform:rotateX(-90deg);background-image:var(--image-file-accelerometer-bottom)}.orientation-top::before,
.orientation-top::after,
.orientation-bottom::before,
.orientation-bottom::after{content:"";width:8px;height:8px}.orientation-top::before,
.orientation-top::after{background-image:var(--image-file-accelerometer-top)}.orientation-bottom::before,
.orientation-bottom::after{background-image:var(--image-file-accelerometer-bottom)}.orientation-top::before,
.orientation-bottom::before{left:-6px;transform-origin:right center;transform:rotateY(-26deg);background-position:left center}.orientation-top::after,
.orientation-bottom::after{right:-6px;transform-origin:left center;transform:rotateY(26deg);background-position:right center}.orientation-axis-input-container{margin-bottom:10px}.orientation-reset-button{min-width:80px}fieldset.device-orientation-override-section{margin:0;display:flex}.panel-section-separator{height:1px;margin-bottom:20px;margin-left:-12px;margin-right:-12px;background:var(--sys-color-divider)}button.text-button{margin:4px 0 0 10px}@media (forced-colors: active){.sensors-view fieldset[disabled]{opacity:100%}}.chrome-select-label{margin-bottom:16px}
/*# sourceURL=${import.meta.resolve("./sensors.css")} */`;var s={location:"Location",noOverride:"No override",overrides:"Overrides",manage:"Manage",manageTheListOfLocations:"Manage the list of locations",other:"Other\u2026",error:"Error",locationUnavailable:"Location unavailable",adjustWithMousewheelOrUpdownKeys:"Adjust with mousewheel or up/down keys. {PH1}: \xB110, Shift: \xB11, Alt: \xB10.01",latitude:"Latitude",longitude:"Longitude",timezoneId:"Timezone ID",locale:"Locale",accuracy:"Accuracy",orientation:"Orientation",off:"Off",customOrientation:"Custom orientation",enableOrientationToRotate:"Enable orientation to rotate",shiftdragHorizontallyToRotate:"Shift+drag horizontally to rotate around the y-axis",deviceOrientationSetToAlphaSBeta:"Device orientation set to alpha: {PH1}, beta: {PH2}, gamma: {PH3}",reset:"Reset",resetDeviceOrientation:"Reset device orientation",forcesTouchInsteadOfClick:"Forces touch instead of click",forcesSelectedIdleStateEmulation:"Forces selected idle state emulation",forcesSelectedPressureStateEmulation:"Forces selected pressure state emulation",presets:"Presets",portrait:"Portrait",portraitUpsideDown:"Portrait upside down",landscapeLeft:"Landscape left",landscapeRight:"Landscape right",displayUp:"Display up",displayDown:"Display down",alpha:"\u03B1 (alpha)",beta:"\u03B2 (beta)",gamma:"\u03B3 (gamma)"},tt=N.i18n.registerUIStrings("panels/sensors/SensorsView.ts",s),l=N.i18n.getLocalizedString.bind(void 0,tt),B=class extends f.Widget.VBox{#a;#t;#e;#r;fieldsetElement;timezoneError;locationSelectElement;latitudeInput;longitudeInput;timezoneInput;localeInput;accuracyInput;localeError;accuracyError;deviceOrientationSetting;deviceOrientation;deviceOrientationOverrideEnabled;deviceOrientationFieldset;stageElement;orientationSelectElement;alphaElement;betaElement;gammaElement;orientationLayer;boxMatrix;mouseDownVector;originalBoxMatrix;constructor(){super({jslog:`${d.panel("sensors").track({resize:!0})}`,useShadowDom:!0}),this.registerRequiredCSS(_),this.contentElement.classList.add("sensors-view"),this.#a=L.Settings.Settings.instance().createSetting("emulation.location-override",""),this.#t=m.EmulationModel.Location.parseSetting(this.#a.get()),this.#e=!1,this.#r=this.contentElement.createChild("section","sensors-group");let t=L.Settings.Settings.instance().moduleSetting("emulation.locations");this.renderLocationSection(this.#t,t),t.addChangeListener(()=>this.renderLocationSection(this.#t,t)),this.createPanelSeparator(),this.deviceOrientationSetting=L.Settings.Settings.instance().createSetting("emulation.device-orientation-override",""),this.deviceOrientation=m.EmulationModel.DeviceOrientation.parseSetting(this.deviceOrientationSetting.get()),this.deviceOrientationOverrideEnabled=!1,this.createDeviceOrientationSection(),this.createPanelSeparator(),this.appendTouchControl(),this.createPanelSeparator(),this.appendIdleEmulator(),this.createPanelSeparator(),this.createHardwareConcurrencySection(),this.createPanelSeparator(),this.createPressureSection(),this.createPanelSeparator()}createPanelSeparator(){this.contentElement.createChild("div").classList.add("panel-section-separator")}renderLocationSection(t,e){let i=e.get(),a=0;if(this.#e)if(t.unavailable)a=i.length+2;else{a=i.length+1;for(let[n,v]of i.entries())if(t.latitude===v.lat&&t.longitude===v.long&&t.timezoneId===v.timezoneId&&t.locale===v.locale){a=n+1;break}}let o=Y.Platform.isMac()?"\u2318":"Ctrl",r=l(s.adjustWithMousewheelOrUpdownKeys,{PH1:o});this.#r.setAttribute("jslog",`${d.section("location")}`),q(k`
      <label class="sensors-group-title" id="location-select-label" for="location-select">${l(s.location)}</label>
      <div class="geo-fields">
        <select
          id="location-select"
          ${g.ref(n=>{n&&(this.locationSelectElement=n)})}
          .selectedIndex=${a}
          @change=${this.#d.bind(this)}
          jslog=${d.dropDown().track({change:!0})}
        >
          <option value=${h.NoOverride} jslog=${d.item("no-override")}>${l(s.noOverride)}</option>
          <optgroup label=${l(s.overrides)}>
            ${i.map(n=>k`
              <option value=${JSON.stringify(n)} jslog=${d.item("custom")}>${n.title}</option>
            `)}
          </optgroup>
          <option value=${h.Custom} jslog=${d.item("other")}>${l(s.other)}</option>
          <optgroup label=${l(s.error)}>
            <option value=${h.Unavailable} jslog=${d.item("unavailable")}>${l(s.locationUnavailable)}</option>
          </optgroup>
        </select>
        <devtools-button
          .variant=${"outlined"}
          class="manage-locations"
          @click=${()=>L.Revealer.reveal(e)}
          aria-label=${l(s.manageTheListOfLocations)}
          jslog=${d.action("sensors.manage-locations").track({click:!0})}
        >
          ${l(s.manage)}
        </devtools-button>
        <fieldset
          id="location-override-section"
          ?disabled=${!this.#e}
          ${g.ref(n=>{n&&(this.fieldsetElement=n)})}
        >
          <div class="latlong-group">
            <!-- @ts-ignore -->
            <input
              id="latitude-input"
              type="number"
              min="-90"
              max="90"
              step="any"
              required
              .value=${String(t.latitude)}
              name="latitude"
              title=${r}
              jslog=${d.textField("latitude").track({change:!0})}
              ${g.ref(n=>{n&&(this.latitudeInput=n)})}
              @change=${this.#i.bind(this)}
              @keydown=${this.#o.bind(this)}
              @focus=${this.#n.bind(this)}
            >
            <label class="latlong-title" for="latitude-input">${l(s.latitude)}</label>
          </div>
          <div class="latlong-group">
            <!-- @ts-ignore -->
            <input
              id="longitude-input"
              type="number"
              min="-180"
              max="180"
              step="any"
              required
              .value=${String(t.longitude)}
              name="longitude"
              title=${r}
              jslog=${d.textField("longitude").track({change:!0})}
              ${g.ref(n=>{n&&(this.longitudeInput=n)})}
              @change=${this.#i.bind(this)}
              @keydown=${this.#o.bind(this)}
              @focus=${this.#n.bind(this)}
            >
            <label class="latlong-title" for="longitude-input">${l(s.longitude)}</label>
          </div>
          <div class="latlong-group">
            <input
              id="timezone-input"
              type="text"
              pattern=".*[a-zA-Z].*"
              .value=${t.timezoneId}
              name="timezone"
              jslog=${d.textField("timezone").track({change:!0})}
              ${g.ref(n=>{n&&(this.timezoneInput=n)})}
              @change=${this.#i.bind(this)}
              @keydown=${this.#o.bind(this)}
              @focus=${this.#n.bind(this)}
            >
            <label class="timezone-title" for="timezone-input">${l(s.timezoneId)}</label>
            <div class="timezone-error" ${g.ref(n=>{n&&(this.timezoneError=n)})}></div>
          </div>
          <div class="latlong-group">
            <input
              id="locale-input"
              type="text"
              pattern=".*[a-zA-Z]{2}.*"
              .value=${t.locale}
              name="locale"
              jslog=${d.textField("locale").track({change:!0})}
              ${g.ref(n=>{n&&(this.localeInput=n)})}
              @change=${this.#i.bind(this)}
              @keydown=${this.#o.bind(this)}
              @focus=${this.#n.bind(this)}
            >
            <label class="locale-title" for="locale-input">${l(s.locale)}</label>
            <div class="locale-error" ${g.ref(n=>{n&&(this.localeError=n)})}></div>
          </div>
          <div class="latlong-group">
            <!-- @ts-ignore -->
            <input
              id="accuracy-input"
              type="number"
              min="0"
              step="any"
              .value=${String(t.accuracy||m.EmulationModel.Location.DEFAULT_ACCURACY)}
              name="accuracy"
              jslog=${d.textField("accuracy").track({change:!0})}
              ${g.ref(n=>{n&&(this.accuracyInput=n)})}
              @change=${this.#i.bind(this)}
              @keydown=${this.#o.bind(this)}
              @focus=${this.#n.bind(this)}
            >
            <label class="accuracy-title" for="accuracy-input">${l(s.accuracy)}</label>
            <div class="accuracy-error" ${g.ref(n=>{n&&(this.accuracyError=n)})}></div>
          </div>
        </fieldset>
      </div>
    `,this.#r)}#d(){this.fieldsetElement.disabled=!1,this.timezoneError.textContent="",this.accuracyError.textContent="";let t=this.locationSelectElement.options[this.locationSelectElement.selectedIndex].value;if(t===h.NoOverride)this.#e=!1,this.clearFieldsetElementInputs(),this.fieldsetElement.disabled=!0;else if(t===h.Custom){this.#e=!0;let e=m.EmulationModel.Location.parseUserInput(this.latitudeInput.value.trim(),this.longitudeInput.value.trim(),this.timezoneInput.value.trim(),this.localeInput.value.trim(),this.accuracyInput.value.trim());if(!e)return;this.#t=e}else if(t===h.Unavailable)this.#e=!0,this.#t=new m.EmulationModel.Location(0,0,"","",m.EmulationModel.Location.DEFAULT_ACCURACY,!0);else{this.#e=!0;let e=JSON.parse(t);this.#t=new m.EmulationModel.Location(e.lat,e.long,e.timezoneId,e.locale,e.accuracy||m.EmulationModel.Location.DEFAULT_ACCURACY,!1),this.latitudeInput.value=e.lat,this.longitudeInput.value=e.long,this.timezoneInput.value=e.timezoneId,this.localeInput.value=e.locale,this.accuracyInput.value=String(e.accuracy||m.EmulationModel.Location.DEFAULT_ACCURACY)}this.applyLocation(),t===h.Custom&&this.latitudeInput.focus()}#i(t){t.currentTarget.checkValidity()&&this.applyLocationUserInput()}#o(t){let e=t.currentTarget;if(t.key==="Enter"){e.checkValidity()&&this.applyLocationUserInput(),t.preventDefault();return}if(!(e===this.latitudeInput||e===this.longitudeInput||e===this.accuracyInput))return;let a=e===this.accuracyInput?1:.1,o=f.UIUtils.modifiedFloatNumber(parseFloat(e.value),t,a);if(o===null)return;let r=e.value;e.value=String(o),e.checkValidity()?this.applyLocationUserInput():e.value=r,t.preventDefault()}#n(t){t.currentTarget.select()}applyLocationUserInput(){let t=m.EmulationModel.Location.parseUserInput(this.latitudeInput.value.trim(),this.longitudeInput.value.trim(),this.timezoneInput.value.trim(),this.localeInput.value.trim(),this.accuracyInput.value.trim());t&&(this.timezoneError.textContent="",this.accuracyError.textContent="",this.setSelectElementLabel(this.locationSelectElement,h.Custom),this.#t=t,this.applyLocation())}applyLocation(){this.#e?this.#a.set(this.#t.toSetting()):this.#a.set("");for(let t of m.TargetManager.TargetManager.instance().models(m.EmulationModel.EmulationModel))t.emulateLocation(this.#e?this.#t:null).catch(e=>{switch(e.type){case"emulation-set-timezone":{this.timezoneError.textContent=e.message;break}case"emulation-set-locale":{this.localeError.textContent=e.message;break}case"emulation-set-accuracy":{this.accuracyError.textContent=e.message;break}}})}clearFieldsetElementInputs(){this.latitudeInput.value="0",this.longitudeInput.value="0",this.timezoneInput.value="",this.localeInput.value="",this.accuracyInput.value=m.EmulationModel.Location.DEFAULT_ACCURACY.toString()}createDeviceOrientationSection(){let t=this.contentElement.createChild("section","sensors-group");t.setAttribute("jslog",`${d.section("device-orientation")}`);let e={title:l(s.off),orientation:h.NoOverride,jslogContext:"off"},i={title:l(s.customOrientation),orientation:h.Custom},a=[{title:l(s.presets),value:[{title:l(s.portrait),orientation:"[0, 90, 0]",jslogContext:"portrait"},{title:l(s.portraitUpsideDown),orientation:"[180, -90, 0]",jslogContext:"portrait-upside-down"},{title:l(s.landscapeLeft),orientation:"[90, 0, -90]",jslogContext:"landscape-left"},{title:l(s.landscapeRight),orientation:"[90, -180, -90]",jslogContext:"landscape-right"},{title:l(s.displayUp),orientation:"[0, 0, 0]",jslogContext:"display-up"},{title:l(s.displayDown),orientation:"[0, -180, 0]",jslogContext:"displayUp-down"}]}];q(k`
        <label class="sensors-group-title" for="orientation-select">${l(s.orientation)}</label>
        <div class="orientation-content">
          <div class="orientation-fields">
            <select
              id="orientation-select"
              ${g.ref(o=>{o&&(this.orientationSelectElement=o)})}
              @change=${this.orientationSelectChanged.bind(this)}
              jslog=${d.dropDown().track({change:!0})}
            >
              <option value=${e.orientation} jslog=${d.item(e.jslogContext)}>${e.title}</option>
              <option value=${i.orientation} jslog=${d.item("custom")}>${i.title}</option>
              ${a.map(o=>k`
                <optgroup label=${o.title}>
                  ${o.value.map(r=>k`
                    <option value=${r.orientation} jslog=${d.item(r.jslogContext)}>${r.title}</option>
                  `)}
                </optgroup>
              `)}
            </select>
            <fieldset
              class="device-orientation-override-section"
              ${g.ref(o=>{o&&(this.deviceOrientationFieldset=o)})}
            >
              <div class="orientation-inputs-cell">
                <div class="orientation-axis-input-container">
                  <!-- @ts-ignore -->
                  <input
                    id="alpha-input"
                    type="number"
                    min="0"
                    max="359.9999"
                    step="any"
                    required
                    ${g.ref(o=>{o&&(this.alphaElement=o)})}
                    @change=${this.#s.bind(this)}
                    @keydown=${this.#l.bind(this)}
                    @focus=${this.#c.bind(this)}
                  >
                  <label for="alpha-input">${l(s.alpha)}</label>
                </div>
                <div class="orientation-axis-input-container">
                  <!-- @ts-ignore -->
                  <input
                    id="beta-input"
                    type="number"
                    min="-180"
                    max="179.9999"
                    step="any"
                    required
                    ${g.ref(o=>{o&&(this.betaElement=o)})}
                    @change=${this.#s.bind(this)}
                    @keydown=${this.#l.bind(this)}
                    @focus=${this.#c.bind(this)}
                  >
                  <label for="beta-input">${l(s.beta)}</label>
                </div>
                <div class="orientation-axis-input-container">
                  <!-- @ts-ignore -->
                  <input
                    id="gamma-input"
                    type="number"
                    min="-90"
                    max="89.9999"
                    step="any"
                    required
                    ${g.ref(o=>{o&&(this.gammaElement=o)})}
                    @change=${this.#s.bind(this)}
                    @keydown=${this.#l.bind(this)}
                    @focus=${this.#c.bind(this)}
                  >
                  <label for="gamma-input">${l(s.gamma)}</label>
                </div>
                <devtools-button
                  .variant=${"outlined"}
                  class="orientation-reset-button"
                  type="reset"
                  aria-label=${l(s.resetDeviceOrientation)}
                  @click=${this.resetDeviceOrientation.bind(this)}
                  jslog=${d.action("sensors.reset-device-orientiation").track({click:!0})}
                >
                  ${l(s.reset)}
                </devtools-button>
              </div>
            </fieldset>
          </div>
          <div
            class="orientation-stage"
            jslog=${d.preview().track({drag:!0})}
            ${g.ref(o=>{o&&!this.stageElement&&(this.stageElement=o,f.UIUtils.installDragHandle(this.stageElement,this.onBoxDragStart.bind(this),r=>{this.onBoxDrag(r)},null,"-webkit-grabbing","-webkit-grab"))})}
          >
            <div class="orientation-layer" ${g.ref(o=>{o&&(this.orientationLayer=o)})}>
              <section
                class="orientation-box orientation-element"
              >
                <section class="orientation-front orientation-element"></section>
                <section class="orientation-top orientation-element"></section>
                <section class="orientation-back orientation-element"></section>
                <section class="orientation-left orientation-element"></section>
                <section class="orientation-right orientation-element"></section>
                <section class="orientation-bottom orientation-element"></section>
              </section>
            </div>
          </div>
        </div>
      `,t),this.enableOrientationFields(!0),this.setBoxOrientation(this.deviceOrientation,!1),this.alphaElement.value=String(this.deviceOrientation.alpha),this.betaElement.value=String(this.deviceOrientation.beta),this.gammaElement.value=String(this.deviceOrientation.gamma)}createPressureSection(){let t=this.contentElement.createChild("div","pressure-section"),e=z.SettingsUI.createControlForSetting(L.Settings.Settings.instance().moduleSetting("emulation.cpu-pressure"),l(s.forcesSelectedPressureStateEmulation));e&&t.appendChild(e)}enableOrientationFields(t){t?(this.deviceOrientationFieldset.disabled=!0,this.stageElement.classList.add("disabled"),f.Tooltip.Tooltip.install(this.stageElement,l(s.enableOrientationToRotate))):(this.deviceOrientationFieldset.disabled=!1,this.stageElement.classList.remove("disabled"),f.Tooltip.Tooltip.install(this.stageElement,l(s.shiftdragHorizontallyToRotate)))}orientationSelectChanged(){let t=this.orientationSelectElement.options[this.orientationSelectElement.selectedIndex].value;if(this.enableOrientationFields(!1),t===h.NoOverride)this.deviceOrientationOverrideEnabled=!1,this.enableOrientationFields(!0),this.applyDeviceOrientation();else if(t===h.Custom)this.deviceOrientationOverrideEnabled=!0,this.resetDeviceOrientation(),this.alphaElement.focus();else{let e=JSON.parse(t);this.deviceOrientationOverrideEnabled=!0,this.deviceOrientation=new m.EmulationModel.DeviceOrientation(e[0],e[1],e[2]),this.setDeviceOrientation(this.deviceOrientation,"selectPreset")}}applyDeviceOrientation(){this.deviceOrientationOverrideEnabled&&this.deviceOrientationSetting.set(this.deviceOrientation.toSetting());for(let t of m.TargetManager.TargetManager.instance().models(m.EmulationModel.EmulationModel))t.emulateDeviceOrientation(this.deviceOrientationOverrideEnabled?this.deviceOrientation:null)}setSelectElementLabel(t,e){let i=Array.prototype.map.call(t.options,a=>a.value);t.selectedIndex=i.indexOf(e)}applyDeviceOrientationUserInput(){this.setDeviceOrientation(m.EmulationModel.DeviceOrientation.parseUserInput(this.alphaElement.value.trim(),this.betaElement.value.trim(),this.gammaElement.value.trim()),"userInput"),this.setSelectElementLabel(this.orientationSelectElement,h.Custom)}resetDeviceOrientation(){this.setDeviceOrientation(new m.EmulationModel.DeviceOrientation(0,90,0),"resetButton"),this.setSelectElementLabel(this.orientationSelectElement,"[0, 90, 0]")}setDeviceOrientation(t,e){if(!t)return;function i(o){return Math.round(o*1e4)/1e4}e!=="userInput"&&(this.alphaElement.value=String(i(t.alpha)),this.betaElement.value=String(i(t.beta)),this.gammaElement.value=String(i(t.gamma)));let a=e!=="userDrag";this.setBoxOrientation(t,a),this.deviceOrientation=t,this.applyDeviceOrientation(),f.ARIAUtils.LiveAnnouncer.alert(l(s.deviceOrientationSetToAlphaSBeta,{PH1:t.alpha,PH2:t.beta,PH3:t.gamma}))}#s(t){t.currentTarget.checkValidity()&&this.applyDeviceOrientationUserInput()}#l(t){let e=t.currentTarget;if(t.key==="Enter"){e.checkValidity()&&this.applyDeviceOrientationUserInput(),t.preventDefault();return}let i=f.UIUtils.modifiedFloatNumber(parseFloat(e.value),t,1);if(i===null)return;let a=e.value;e.value=String(i),e.checkValidity()?this.applyDeviceOrientationUserInput():e.value=a,t.preventDefault()}#c(t){t.currentTarget.select()}setBoxOrientation(t,e){e?this.stageElement.classList.add("is-animating"):this.stageElement.classList.remove("is-animating");let{alpha:i,beta:a,gamma:o}=t;this.boxMatrix=new DOMMatrixReadOnly().rotate(0,0,i).rotate(a,0,0).rotate(0,o,0),this.orientationLayer.style.transform=`rotateY(${i}deg) rotateX(${-a}deg) rotateZ(${o}deg)`}onBoxDrag(t){let e=this.calculateRadiusVector(t.x,t.y);if(!e||!this.mouseDownVector)return!0;t.consume(!0);let i,a;t.shiftKey?(i=new C.Vector(0,0,1),a=(e.x-this.mouseDownVector.x)*W):(i=C.crossProduct(this.mouseDownVector,e),a=C.calculateAngle(this.mouseDownVector,e));let o=new DOMMatrixReadOnly().rotateAxisAngle(-i.x,i.z,i.y,a).multiply(this.originalBoxMatrix),r=C.EulerAngles.fromDeviceOrientationRotationMatrix(o),n=new m.EmulationModel.DeviceOrientation(r.alpha,r.beta,r.gamma);return this.setDeviceOrientation(n,"userDrag"),this.setSelectElementLabel(this.orientationSelectElement,h.Custom),!1}onBoxDragStart(t){return!this.deviceOrientationOverrideEnabled||(this.mouseDownVector=this.calculateRadiusVector(t.x,t.y),this.originalBoxMatrix=this.boxMatrix,!this.mouseDownVector)?!1:(t.consume(!0),!0)}calculateRadiusVector(t,e){let i=this.stageElement.getBoundingClientRect(),a=Math.max(i.width,i.height)/2,o=(t-i.left-i.width/2)/a,r=(e-i.top-i.height/2)/a,n=o*o+r*r;return n>.5?new C.Vector(o,r,.5/Math.sqrt(n)):new C.Vector(o,r,Math.sqrt(1-n))}appendTouchControl(){let t=this.contentElement.createChild("div","touch-section"),e=z.SettingsUI.createControlForSetting(L.Settings.Settings.instance().moduleSetting("emulation.touch"),l(s.forcesTouchInsteadOfClick));e&&t.appendChild(e)}appendIdleEmulator(){let t=this.contentElement.createChild("div","idle-section"),e=z.SettingsUI.createControlForSetting(L.Settings.Settings.instance().moduleSetting("emulation.idle-detection"),l(s.forcesSelectedIdleStateEmulation));e&&t.appendChild(e)}createHardwareConcurrencySection(){let t=this.contentElement.createChild("div","concurrency-section"),{checkbox:e,numericInput:i,reset:a,warning:o}=G.ThrottlingManager.throttlingManager().createHardwareConcurrencySelector(),r=document.createElement("div");r.classList.add("concurrency-details"),r.append(i.element,a.element,o.element),t.append(e,r)}},et={NoOverride:"no-override",Nominal:"nominal",Fair:"fair",Serious:"serious",Critical:"critical"},h={NoOverride:"noOverride",Custom:"custom",Unavailable:"unavailable"},F=class{handleAction(t,e){return f.ViewManager.ViewManager.instance().showView("sensors"),!0}},W=16;export{H as LocationsSettingsTab,X as SensorsView};
//# sourceMappingURL=sensors.js.map
