var T=Object.defineProperty;var N=(n,t)=>{for(var e in t)T(n,e,{get:t[e],enumerable:!0})};var I={};N(I,{DEFAULT_VIEW:()=>E,WebauthnPaneImpl:()=>g});import"./../../ui/legacy/legacy.js";import"./../../ui/legacy/components/data_grid/data_grid.js";import*as A from"./../../core/common/common.js";import*as u from"./../../core/host/host.js";import*as m from"./../../core/i18n/i18n.js";import*as v from"./../../core/sdk/sdk.js";import"./../../ui/components/buttons/buttons.js";import*as w from"./../../ui/components/input/input.js";import*as h from"./../../ui/legacy/legacy.js";import*as f from"./../../ui/lit/lit.js";import*as l from"./../../ui/visual_logging/visual_logging.js";var $=`@scope to (devtools-widget > *){.webauthn-pane{overflow:auto;min-width:500px}.webauthn-toolbar-container{display:flex;background-color:var(--sys-color-cdt-base-container);border-bottom:1px solid var(--sys-color-divider);flex:0 0 auto}.webauthn-toolbar{display:inline-block}.authenticators-view{padding:0 var(--sys-size-9);min-height:auto;display:none}.webauthn-pane.enabled .authenticators-view{display:block}.new-authenticator-title{display:block;padding:var(--sys-size-7) 0 var(--sys-size-5) 0;font:var(--sys-typescale-headline5);&:has(devtools-button){padding-top:var(--sys-size-4)}}.new-authenticator-container{display:none;padding-left:var(--sys-size-9)}.authenticator-option{> select{margin:0 var(--sys-size-9) var(--sys-size-3) var(--sys-size-9)}> devtools-button{margin:var(--sys-size-3) var(--sys-size-9)}> input[type="checkbox"]{margin:var(--sys-size-5) var(--sys-size-9)}}.webauthn-pane.enabled .new-authenticator-container{display:block}.new-authenticator-form{border:none;flex:0 0 auto;margin:0;padding-bottom:var(--sys-size-5)}.webauthn-pane select{width:120px}.authenticator-section{display:block}.divider{border-bottom:var(--sys-size-1) solid var(--sys-color-divider);margin:10px calc(var(--sys-size-9) * -1) 0}.authenticator-fields{border:none;flex:0 0 auto;margin-bottom:10px}.authenticator-section-header{margin:var(--sys-size-4) 0 var(--sys-size-5) calc(var(--sys-size-5) * -1);display:flex;justify-content:space-between;align-items:flex-end}.authenticator-section-title{line-height:24px;display:inline-flex}.authenticator-section-title .authenticator-name-field{display:inline-block;border:none;animation:save-flash 0.2s;text-overflow:ellipsis;font:var(--sys-typescale-headline5)}.authenticator-section-title.editing-name .authenticator-name-field{border-bottom:1px solid var(--sys-color-neutral-outline);font-weight:normal;animation:none}.authenticator-field-value{font:var(--sys-typescale-monospace-regular);line-height:18px}.authenticator-field{margin:var(--sys-size-3) 0}.authenticator-field,
  .authenticator-option{display:flex;align-items:center}.authenticator-option-label{color:var(--sys-color-on-surface-subtle);font:var(--sys-typescale-body5-medium);padding-right:var(--sys-size-6);text-align:left;min-width:152px;line-height:18px}::part(action-button){min-width:20px;margin:4px}.active-button-container{display:inline-block;min-width:28px}.edit-name-toolbar{display:inline-block;vertical-align:middle}@keyframes save-flash{from{opacity:0%}to{opacity:100%}}::part(credentialId-column),
  ::part(isResidentCredential-column),
  ::part(rpId-column),
  ::part(userHandle-column),
  ::part(signCount-column),
  ::part(actions-column){vertical-align:middle}.credentials-title{display:block;font:var(--sys-typescale-headline5);padding:var(--sys-size-7) 0 var(--sys-size-5) 0;border-top:var(--sys-size-1) solid var(--sys-color-divider);margin-right:calc(var(--sys-size-9) * -1)}.code{font-family:var(--monospace-font-family)}.learn-more{display:flex;justify-content:center;align-items:center;height:100%;text-align:center;overflow:hidden}.webauthn-pane.enabled .learn-more{display:none}}
/*# sourceURL=${import.meta.resolve("./webauthnPane.css")} */`;var{render:j,html:d,Directives:{ref:y,repeat:k,classMap:b}}=f,{widget:P}=h.Widget,s={export:"Export",remove:"Remove",noCredentialsTryCallingSFromYour:"No credentials. Try calling {PH1} from your website.",enableVirtualAuthenticator:"Enable virtual authenticator environment",id:"ID",isResident:"Is Resident",rpId:"RP ID",userHandle:"User Handle",signCount:"Signature Count",actions:"Actions",credentials:"Credentials",noAuthenticator:"No authenticator set up",useWebauthnForPhishingresistant:"Use WebAuthn for phishing-resistant authentication.",newAuthenticator:"New authenticator",protocol:"Protocol",transport:"Transport",supportsResidentKeys:"Supports resident keys",supportsLargeBlob:"Supports large blob",supportsHmacSecret:"Supports hmac-secret",supportsHmacSecretMc:"Supports hmac-secret-mc",add:"Add",active:"Active",editName:"Edit name",enterNewName:"Enter new name",saveName:"Save name",authenticatorS:"Authenticator {PH1}",privateKeypem:"Private key.pem",uuid:"UUID",supportsUserVerification:"Supports user verification",yes:"Yes",no:"No",setSAsTheActiveAuthenticator:"Set {PH1} as the active authenticator"},x=m.i18n.registerUIStrings("panels/webauthn/WebauthnPane.ts",s),o=m.i18n.getLocalizedString.bind(void 0,x),z=f.i18nTemplate.bind(void 0,x),M="https://developer.chrome.com/docs/devtools/webauthn";function B(n,t,e,a){return d`
    <devtools-data-grid name=${o(s.credentials)} inline striped>
      <table>
        <thead>
          <tr>
            <th id="credentialId" weight="24" text-overflow="ellipsis">${o(s.id)}</th>
            <th id="isResidentCredential" type="boolean" weight="10">${o(s.isResident)}</th>
            <th id="rpId" weight="16.5">${o(s.rpId)}</th>
            <th id="userHandle" weight="16.5">${o(s.userHandle)}</th>
            <th id="signCount" weight="16.5">${o(s.signCount)}</th>
            <th id="actions" weight="16.5">${o(s.actions)}</th>
          </tr>
        </thead>
        <tbody>
        ${t.length?k(t,i=>i.credentialId,i=>d`
          <tr>
            <td>${i.credentialId}</td>
            <td>${i.isResidentCredential}</td>
            <td>${i.rpId}</td>
            <td>${i.userHandle}</td>
            <td>${i.signCount}</td>
            <td>
              <devtools-button .variant=${"outlined"}
                  part="action-button"
                  @click=${()=>e(i)}
                  .jslogContext=${"webauthn.export-credential"}>
                ${o(s.export)}
              </devtools-button>
              <devtools-button .variant=${"outlined"}
                  part="action-button"
                  @click=${()=>a(i.credentialId)}
                  .jslogContext=${"webauthn.remove-credential"}>
                ${o(s.remove)}
              </devtools-button>
            </td>
          </tr>`):d`
          <tr>
            <td class="center" colspan=6>
              ${z(s.noCredentialsTryCallingSFromYour,{PH1:d`<span class="code">navigator.credentials.create()</span>`})}
            </td>
          </tr>`}
        </tbody>
      </table>
    </devtools-data-grid>`}var S="PRIVATE",K=`-----BEGIN ${S} KEY-----
`,O=`-----END ${S} KEY-----`,D={Ctap2:"ctap2",U2f:"u2f"};function q(n,t){let e=o(s.enableVirtualAuthenticator);return d`
    <div class="webauthn-toolbar-container" jslog=${l.toolbar()} role="toolbar">
      <devtools-toolbar class="webauthn-toolbar" role="presentation">
        <devtools-checkbox title=${e}
            @click=${t}
            .jslogContext=${"virtual-authenticators"}
            .checked=${n}>
          ${e}
        </devtools-checkbox>
      </devtools-toolbar>
    </div>`}function _(){return d`
    <devtools-widget class="learn-more" ${P(h.EmptyWidget.EmptyWidget,{header:o(s.noAuthenticator),text:o(s.useWebauthnForPhishingresistant),link:M})}>
    </devtools-widget>`}function W(n,t,e,a){let i=n.protocol==="ctap2";return d`
    <div class="new-authenticator-container">
      <label class="new-authenticator-title">
        ${o(s.newAuthenticator)}
      </label>
      <div class="new-authenticator-form" jslog=${l.section("new-authenticator")}>
        <div class="authenticator-option">
          <label class="authenticator-option-label" for="protocol">
            ${o(s.protocol)}
          </label>
          <select id="protocol" jslog=${l.dropDown("protocol").track({change:!0})}
              value=${n.protocol}
              @change=${r=>e({protocol:r.target.value})}>
            ${Object.values(D).sort().map(r=>d`
              <option value=${r} jslog=${l.item(r).track({click:!0})}>
                ${r}
              </option>`)}
          </select>
        </div>
        <div class="authenticator-option">
          <label for="transport" class="authenticator-option-label">
            ${o(s.transport)}
          </label>
          <select id="transport"
              value=${n.transport}
              jslog=${l.dropDown("transport").track({change:!0})}
              @change=${r=>e({transport:r.target.value})}>
            ${["usb","ble","nfc",...i?["internal"]:[]].map(r=>d`
                <option value=${r} jslog=${l.item(r).track({click:!0})}
                        .selected=${n.transport===r}
                        .disabled=${!t&&r==="internal"}>
                  ${r}
                </option>`)}
          </select>
        </div>
        <div class="authenticator-option">
          <label for="resident-key" class="authenticator-option-label">
            ${o(s.supportsResidentKeys)}
          </label>
          <input id="resident-key" class="authenticator-option-checkbox" type="checkbox"
              jslog=${l.toggle("resident-key").track({change:!0})}
              @change=${r=>e({hasResidentKey:r.target.checked})}
              .checked=${!!(n.hasResidentKey&&i)} .disabled=${!i}>
        </div>
        <div class="authenticator-option">
          <label for="user-verification" class="authenticator-option-label">
            ${o(s.supportsUserVerification)}
          </label>
          <input id="user-verification" class="authenticator-option-checkbox" type="checkbox"
              jslog=${l.toggle("user-verification").track({change:!0})}
              @change=${r=>e({hasUserVerification:r.target.checked})}
              .checked=${!!(n.hasUserVerification&&i)}
              .disabled=${!i}>
        </div>
        <div class="authenticator-option">
          <label for="large-blob" class="authenticator-option-label">
            ${o(s.supportsLargeBlob)}
          </label>
          <input id="large-blob" class="authenticator-option-checkbox" type="checkbox"
              jslog=${l.toggle("large-blob").track({change:!0})}
              @change=${r=>e({hasLargeBlob:r.target.checked})}
              .checked=${!!(n.hasLargeBlob&&i&&n.hasResidentKey)}
              .disabled=${!n.hasResidentKey||!i}>
        </div>
        <div class="authenticator-option">
          <label for="hmac-secret" class="authenticator-option-label">
            ${o(s.supportsHmacSecret)}
          </label>
          <input id="hmac-secret" class="authenticator-option-checkbox" type="checkbox"
              jslog=${l.toggle("hmac-secret").track({change:!0})}
              @change=${r=>e({hasHmacSecret:r.target.checked})}
              .checked=${!!((n.hasHmacSecret||n.hasHmacSecretMc)&&i)}
              .disabled=${!i||!!n.hasHmacSecretMc}>
        </div>
        <div class="authenticator-option">
          <label for="hmac-secret-mc" class="authenticator-option-label">
            ${o(s.supportsHmacSecretMc)}
          </label>
          <input id="hmac-secret-mc" class="authenticator-option-checkbox" type="checkbox"
              jslog=${l.toggle("hmac-secret-mc").track({change:!0})}
              @change=${r=>{e(r.target.checked?{hasHmacSecretMc:!0,hasHmacSecret:!0}:{hasHmacSecretMc:!1})}}
              .checked=${!!(n.hasHmacSecretMc&&i)}
              .disabled=${!i}>
        </div>
        <div class="authenticator-option">
          <div class="authenticator-option-label"></div>
          <devtools-button @click=${a}
              id="add-authenticator"
              .jslogContext=${"webauthn.add-authenticator"}
              .variant=${"outlined"}>
            ${o(s.add)}
          </devtools-button>
        </div>
      </div>
    </div>`}function F(n,t,e,a,i,r,p,C,L,V,U){function H(c){if(!c)return;let R=window.matchMedia("(prefers-reduced-motion: reduce)").matches;c.scrollIntoView({block:"nearest",behavior:R?"auto":"smooth"})}return d`
    <div class="authenticator-section" data-authenticator-id=${n}
         jslog=${l.section("authenticator")}
          ${y(c=>{U.revealSection.set(n,H.bind(null,c))})}>
      <div class="authenticator-section-header">
        <div class="authenticator-section-title" role="heading" aria-level="2">
          <devtools-toolbar class="edit-name-toolbar">
            <devtools-button title=${o(s.editName)}
                class=${b({hidden:a})}
                @click=${r}
                .iconName=${"edit"} .variant=${"toolbar"}
                .jslogContext=${"edit-name"}></devtools-button>
            <devtools-button title=${o(s.saveName)}
                @click=${c=>p((c.target.parentElement?.nextSibling).value)}
                .iconName=${"checkmark"} .variant=${"toolbar"}
                class=${b({hidden:!a})}
                .jslogContext=${"save-name"}></devtools-button>
          </devtools-toolbar>
          <input class="authenticator-name-field"
              placeholder=${o(s.enterNewName)}
              jslog=${l.textField("name").track({keydown:"Enter",change:!0})}
              value=${o(s.authenticatorS,{PH1:t.name})} .disabled=${!a}
              ${y(c=>{c instanceof HTMLInputElement&&a&&c.focus()})}
              @focusout=${c=>p(c.target.value)}
              @keydown=${c=>{c.key==="Enter"&&p(c.target.value)}}>
        </div>
        <div class="active-button-container">
          <label title=${o(s.setSAsTheActiveAuthenticator,{PH1:t.name})}>
            <input type="radio" .checked=${e} @change=${c=>{c.target.checked&&i()}}
                  jslog=${l.toggle("webauthn.active-authenticator").track({change:!0})}>
            ${o(s.active)}
          </label>
        </div>
        <button class="text-button" @click=${C}
            jslog=${l.action("webauthn.remove-authenticator").track({click:!0})}>
          ${o(s.remove)}
        </button>
      </div>
      ${Y(n,t.options)}
      <div class="credentials-title">${o(s.credentials)}</div>
      ${B(n,t.credentials,L,V)}
      <div class="divider"></div>
    </div>`}function Y(n,t){return d`
    <div class="authenticator-fields">
      <div class="authenticator-field">
        <label class="authenticator-option-label">${o(s.uuid)}</label>
        <div class="authenticator-field-value">${n}</div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">${o(s.protocol)}</label>
        <div class="authenticator-field-value">${t.protocol}</div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">${o(s.transport)}</label>
        <div class="authenticator-field-value">${t.transport}</div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${o(s.supportsResidentKeys)}
        </label>
        <div class="authenticator-field-value">
          ${t.hasResidentKey?o(s.yes):o(s.no)}
        </div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${o(s.supportsLargeBlob)}
        </label>
        <div class="authenticator-field-value">
          ${t.hasLargeBlob?o(s.yes):o(s.no)}
        </div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${o(s.supportsUserVerification)}
        </label>
        <div class="authenticator-field-value">
          ${t.hasUserVerification?o(s.yes):o(s.no)}
        </div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${o(s.supportsHmacSecret)}
        </label>
        <div class="authenticator-field-value">
          ${t.hasHmacSecret?o(s.yes):o(s.no)}
        </div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${o(s.supportsHmacSecretMc)}
        </label>
        <div class="authenticator-field-value">
          ${t.hasHmacSecretMc?o(s.yes):o(s.no)}
        </div>
      </div>
    </div>`}var E=(n,t,e)=>{j(d`
    <style>${w.checkboxStyles}</style>
    <style>${$}</style>
    <div class="webauthn-pane flex-auto ${b({enabled:n.enabled})}">
      ${q(n.enabled,n.onToggleEnabled)}
      <div class="authenticators-view">
         ${k([...n.authenticators.entries()],([a])=>a,([a,i])=>F(a,i,n.activeAuthenticatorId===a,n.editingAuthenticatorId===a,n.onActivateAuthenticator.bind(n,a),n.onEditName.bind(n,a),n.onSaveName.bind(n,a),n.onRemoveAuthenticator.bind(n,a),n.onExportCredential,n.onRemoveCredential.bind(n,a),t))}
      </div>
      ${_()}
      ${W(n.newAuthenticatorOptions,n.internalTransportAvailable,n.updateNewAuthenticatorOptions,n.addAuthenticator)}
    </div>`,e)},g=class extends h.Panel.Panel{async#h(t){if(!this.#t)throw new Error("WebAuthn model is not available.");let e=await this.#t.addAuthenticator(t),a=e.slice(-5);return this.#e.set(e,{name:a,options:t,credentials:[]}),this.requestUpdate(),this.#t.addEventListener("CredentialAdded",this.#f.bind(this,e)),this.#t.addEventListener("CredentialAsserted",this.#b.bind(this,e)),this.#t.addEventListener("CredentialUpdated",this.#b.bind(this,e)),this.#t.addEventListener("CredentialDeleted",this.#$.bind(this,e)),e}#i=null;#o=null;#u=!1;#e=new Map;#n=!1;#a;#t;#s={protocol:"ctap2",ctap2Version:"ctap2_1",transport:"usb",hasResidentKey:!1,hasUserVerification:!1,hasLargeBlob:!1,automaticPresenceSimulation:!0,isUserVerified:!0};#r=!1;#l;#v;#p={revealSection:new Map};constructor(t=E){super("webauthn"),this.#v=t,v.TargetManager.TargetManager.instance().observeModels(v.WebAuthnModel.WebAuthnModel,this,{scoped:!0}),this.#a=A.Settings.Settings.instance().createSetting("webauthn-authenticators",[]),this.#c(),this.performUpdate()}performUpdate(){let t={enabled:this.#n,onToggleEnabled:this.#A.bind(this),authenticators:this.#e,activeAuthenticatorId:this.#i,editingAuthenticatorId:this.#o,newAuthenticatorOptions:this.#s,internalTransportAvailable:!this.#r,updateNewAuthenticatorOptions:this.#w.bind(this),addAuthenticator:this.#k.bind(this),onActivateAuthenticator:this.#d.bind(this),onEditName:this.#E.bind(this),onSaveName:this.#I.bind(this),onRemoveAuthenticator:this.removeAuthenticator.bind(this),onExportCredential:this.#x.bind(this),onRemoveCredential:this.#S.bind(this)};this.#v(t,this.#p,this.contentElement)}modelAdded(t){t.target()===t.target().outermostTarget()&&(this.#t=t)}modelRemoved(t){t.target()===t.target().outermostTarget()&&(this.#t=void 0)}async#m(){let t=null,e=this.#a.get();for(let a of e){if(!this.#t)continue;let i=await this.#h(a);a.authenticatorId=i,a.active&&(t=i)}this.#a.set(e),t&&this.#d(t)}async ownerViewDisposed(){this.#n=!1,await this.#g(!1)}#f(t,{data:e}){let a=this.#e.get(t);a&&(a.credentials.push(e.credential),this.requestUpdate())}#b(t,{data:e}){let a=this.#e.get(t);if(!a)return;let i=a.credentials.find(r=>r.credentialId===e.credential.credentialId);i&&(Object.assign(i,e.credential),this.requestUpdate())}#$(t,{data:e}){let a=this.#e.get(t);if(!a)return;let i=a.credentials.findIndex(r=>r.credentialId===e.credentialId);i<0||(a.credentials.splice(i,1),this.requestUpdate())}async#g(t){await this.#l,this.#l=new Promise(async e=>{t&&!this.#u&&(u.userMetrics.actionTaken(u.UserMetrics.Action.VirtualAuthenticatorEnvironmentEnabled),this.#u=!0),this.#t&&await this.#t.setVirtualAuthEnvEnabled(t),t?await this.#m():this.#y(),this.#l=void 0,this.#n=t,this.requestUpdate(),e()})}#y(){this.#e.clear()}#A(){this.#g(!this.#n)}#w(t){Object.assign(this.#s,t),this.requestUpdate()}#c(){this.#r=!!this.#a.get().find(t=>t.transport==="internal"),this.#r&&this.#s.transport==="internal"&&(this.#s.transport="nfc"),this.requestUpdate()}async#k(){let t={...this.#s};if(this.#t){let e=await this.#h(t);this.#i=e;let a=this.#a.get();a.push({authenticatorId:e,active:!0,...t}),this.#a.set(a.map(i=>({...i,active:i.authenticatorId===e}))),this.#c(),await this.updateComplete,this.#p.revealSection.get(e)?.()}}#x(t){let e=K;for(let i=0;i<t.privateKey.length;i+=64)e+=t.privateKey.substring(i,i+64)+`
`;e+=O;let a=document.createElement("a");a.download=o(s.privateKeypem),a.href="data:application/x-pem-file,"+encodeURIComponent(e),a.click()}#S(t,e){let a=this.#e.get(t);if(!a)return;let i=a.credentials.findIndex(r=>r.credentialId===e);i<0||(a.credentials.splice(i,1),this.requestUpdate(),this.#t&&this.#t.removeCredential(t,e))}#E(t){this.#o=t,this.requestUpdate()}#I(t,e){let a=this.#e.get(t);a&&(a.name=e,this.#o=null,this.requestUpdate())}removeAuthenticator(t){this.#e.delete(t),this.requestUpdate(),this.#t&&this.#t.removeAuthenticator(t);let a=this.#a.get().filter(i=>i.authenticatorId!==t);if(this.#a.set(a),this.#i===t){let i=Array.from(this.#e.keys());i.length?this.#d(i[0]):this.#i=null}this.#c()}async#d(t){await this.#C(),this.#t&&await this.#t.setAutomaticPresenceSimulation(t,!0),this.#i=t;let a=this.#a.get().map(i=>({...i,active:i.authenticatorId===t}));this.#a.set(a),this.requestUpdate()}async#C(){this.#i&&this.#t&&await this.#t.setAutomaticPresenceSimulation(this.#i,!1),this.#i=null,this.requestUpdate()}};export{I as WebauthnPane};
//# sourceMappingURL=webauthn.js.map
