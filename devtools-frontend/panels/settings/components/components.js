var $=Object.defineProperty;var w=(e,i)=>{for(var t in i)$(e,t,{get:i[t],enumerable:!0})};var C={};w(C,{SyncSection:()=>f});import"./../../../ui/components/settings/settings.js";import"./../../../ui/components/tooltips/tooltips.js";import"./../../../ui/kit/kit.js";import*as p from"./../../../core/common/common.js";import*as a from"./../../../core/host/host.js";import*as h from"./../../../core/i18n/i18n.js";import*as c from"./../../../models/badges/badges.js";import"./../../../ui/components/buttons/buttons.js";import*as u from"./../../../ui/helpers/helpers.js";import*as b from"./../../../ui/legacy/legacy.js";import*as r from"./../../../ui/lit/lit.js";import*as y from"./../../../ui/visual_logging/visual_logging.js";import*as S from"./../../common/common.js";import*as x from"./../../utils/utils.js";var m=`@scope to (devtools-widget > *){:scope{break-inside:avoid;display:block;width:100%;position:relative}fieldset{border:0;padding:0;padding:4px 0 0}.link{color:var(--sys-color-primary);text-decoration:underline;cursor:pointer;outline-offset:2px}.account-avatar{border:0;border-radius:var(--sys-shape-corner-full);display:block;height:var(--sys-size-9);width:var(--sys-size-9)}.account-info{display:flex;align-items:center}.account-email{display:flex;flex-direction:column;margin-left:8px}.not-signed-in{padding-bottom:4px}.setting-checkbox-container{display:flex;align-items:center;gap:var(--sys-size-2)}.setting-checkbox{display:inline-block}.gdp-profile-container{padding-bottom:var(--sys-size-4)}.gdp-profile-container .divider{left:0;position:absolute;width:100%;height:var(--sys-size-1);background:var(--sys-color-divider)}.gdp-profile-container .gdp-profile-header{display:flex;align-items:center;gap:var(--sys-size-5);font-family:"Google Sans",system-ui;font-size:var(--sys-typescale-body3-size);height:var(--sys-size-11)}.gdp-profile-container .gdp-profile-header .gdp-logo{background-image:var(--image-file-gdp-logo-light);background-size:contain;width:203px;height:18px;background-repeat:no-repeat}:host-context(.theme-with-dark-background) & .gdp-profile-container .gdp-profile-header .gdp-logo{background-image:var(--image-file-gdp-logo-dark)}.gdp-profile-container .gdp-profile-sign-up-content{padding-top:var(--sys-size-7);display:flex;justify-content:space-between;align-items:center}.gdp-profile-container .gdp-profile-details-content{padding-top:var(--sys-size-7);font:var(--sys-typescale-body4-regular)}.gdp-profile-container .gdp-profile-details-content .plan-details{margin-top:var(--sys-size-3);height:18px;display:flex;align-items:center}.gdp-profile-container .gdp-profile-details-content .setting-container{margin:calc(var(--sys-size-3) - 6px) 0 -6px;display:flex;align-items:center;gap:var(--sys-size-2)}.gdp-profile-container .gdp-profile-details-content .tooltip-content{max-width:278px;padding:var(--sys-size-2) var(--sys-size-3);font:var(--sys-typescale-body5-regular)}}
/*# sourceURL=${import.meta.resolve("./syncSection.css")} */`;var n={syncDisabled:"To turn this setting on, you must enable Chrome sync.",preferencesSyncDisabled:"You need to first enable saving `Chrome` settings in your `Google` account.",signedIn:"Signed into Chrome as:",notSignedIn:"You're not signed into Chrome.",gdpStandardPlan:"Standard plan",gdpPremiumSubscription:"Premium",gdpProSubscription:"Pro",gdpUnknownSubscription:"Unknown plan",signUp:"Sign up",viewProfile:"View profile",tooltipDisclaimerText:"When you qualify for a badge, the badge\u2019s identifier and the type of activity you did to earn it are sent to Google",relevantData:"Relevant data",dataDisclaimer:"({PH1} is sent to Google)"},k=h.i18n.registerUIStrings("panels/settings/components/SyncSection.ts",n),s=h.i18n.getLocalizedString.bind(void 0,k),I=r.i18nTemplate.bind(void 0,k),{html:o,render:U,Directives:{ref:G}}=r;function B(e){if(!e.activeSubscription||e.activeSubscription.subscriptionStatus!==a.GdpClient.SubscriptionStatus.ENABLED)return s(n.gdpStandardPlan);switch(e.activeSubscription.subscriptionTier){case a.GdpClient.SubscriptionTier.PREMIUM_ANNUAL:case a.GdpClient.SubscriptionTier.PREMIUM_MONTHLY:return s(n.gdpPremiumSubscription);case a.GdpClient.SubscriptionTier.PRO_ANNUAL:case a.GdpClient.SubscriptionTier.PRO_MONTHLY:return s(n.gdpProSubscription);default:return s(n.gdpUnknownSubscription)}}var D=(e,i,t)=>{let l=()=>{if(!e.syncInfo.accountEmail)return r.nothing;let g=e.warningType==="SYNC_DISABLED"?s(n.syncDisabled):s(n.preferencesSyncDisabled);return o`
      <div class="setting-checkbox-container">
        <setting-checkbox class="setting-checkbox"
          .data=${{setting:e.syncSetting}}>
        </setting-checkbox>
        ${e.warningType?o`
          <devtools-button
            aria-details="settings-sync-info"
            .iconName=${"info"}
            .variant=${"icon"}
            .size=${"SMALL"}
            @click=${e.onWarningClick}>
          </devtools-button>
          <devtools-tooltip
              id="settings-sync-info"
              variant="rich">
            ${g}
          </devtools-tooltip>`:r.nothing}
      </div>
    `},P=()=>e.syncInfo.accountEmail?o`
      <div class="account-info">
        <img class="account-avatar" src="data:image/png;base64, ${e.syncInfo.accountImage}"
          alt="Account avatar" />
        <div class="account-email">
          <span>${s(n.signedIn)}</span>
          <span>${e.syncInfo.accountEmail}</span>
        </div>
      </div>`:o`
        <div class="not-signed-in">${s(n.notSignedIn)}</div>
      `,E=()=>{if(!e.isEligibleToCreateGdpProfile&&!e.gdpProfile)return r.nothing;let g=a.GdpClient.isBadgesEnabled()&&e.receiveBadgesSetting,v=()=>o`
        <div class="gdp-profile-header">
          <div class="gdp-logo" role="img" aria-label="Google Developer Program"></div>
        </div>
      `;return o`
      <div class="gdp-profile-container" .jslog=${y.section().context("gdp-profile")}>
        <div class="divider"></div>
        ${e.gdpProfile?o`
          <div class="gdp-profile-details-content">
            ${v()}
            <div class="plan-details">
              ${B(e.gdpProfile)}
              &nbsp;·&nbsp;
              <devtools-link
                jslogcontext="view-profile"
                class="link"
                href=${a.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK}>
                ${s(n.viewProfile)}
              </devtools-link></div>
              ${g?o`
                <div class="setting-container" ${G(d=>{i.highlightReceiveBadgesSetting=()=>{d&&x.PanelUtils.highlightElement(d)}})}>
                  <setting-checkbox class="setting-checkbox"
                    .data=${{setting:e.receiveBadgesSetting}}
                    @change=${d=>e.onReceiveBadgesSettingClick(d)}>
                  </setting-checkbox>
                  <span>${I(n.dataDisclaimer,{PH1:o`
                    <span class="link" tabindex="0" aria-details="gdp-profile-tooltip">
                      ${s(n.relevantData)}</span>
                    <devtools-tooltip id="gdp-profile-tooltip" variant="rich">
                      <div class="tooltip-content" tabindex="0">
                      ${s(n.tooltipDisclaimerText)}</div>
                    </devtools-tooltip>`})}
                  </span>
                </div>
              `:r.nothing}
          </div>
        `:o`
          <div class="gdp-profile-sign-up-content">
            ${v()}
            <devtools-button
              @click=${e.onSignUpClick}
              .jslogContext=${"open-sign-up-dialog"}
              .variant=${"outlined"}>
                ${s(n.signUp)}
            </devtools-button>
          </div>
        `}
      </div>
    `};U(o`
    <style>${m}</style>
    <fieldset>
      ${P()}
      ${l()}
      ${E()}
    </fieldset>
  `,t)},f=class extends b.Widget.Widget{#e={isSyncActive:!1};#i;#t;#n=!1;#s;#o;#a={};constructor(i,t=D){super(i),this.#o=t,this.#t=p.Settings.Settings.instance().moduleSetting("receive-gdp-badges"),this.#i=p.Settings.moduleSetting("sync-preferences")}wasShown(){super.wasShown(),this.requestUpdate()}set syncInfo(i){this.#e=i,this.requestUpdate(),i.accountEmail&&this.#r()}async highlightReceiveBadgesSetting(){this.requestUpdate(),await this.updateComplete,this.#a.highlightReceiveBadgesSetting?.()}performUpdate(){let i=!this.#e.isSyncActive||!this.#e.arePreferencesSynced;this.#i?.setDisabled(i);let t;this.#e.isSyncActive?this.#e.arePreferencesSynced||(t="PREFERENCES_SYNC_DISABLED"):t="SYNC_DISABLED";let l={syncInfo:this.#e,syncSetting:this.#i,receiveBadgesSetting:this.#t,gdpProfile:this.#s,isEligibleToCreateGdpProfile:a.GdpClient.isGdpProfilesAvailable()&&this.#n,onSignUpClick:this.#c.bind(this),onReceiveBadgesSettingClick:this.#d.bind(this),onWarningClick:this.#l.bind(this),warningType:t};this.#o(l,this.#a,this.contentElement)}#c(){S.GdpSignUpDialog.show({onSuccess:this.#r.bind(this)})}#d(i){let t=i.target;c.UserBadges.instance().initialize().then(()=>{t.checked&&c.UserBadges.instance().recordAction(c.BadgeAction.RECEIVE_BADGES_SETTING_ENABLED)})}#l(i){let t=this.#e.isSyncActive?"chrome://settings/syncSetup/advanced":"chrome://settings/syncSetup";u.openInNewTab(t),i.consume()}async#r(){if(!a.GdpClient.isGdpProfilesAvailable())return;let i=await a.GdpClient.GdpClient.instance().getProfile();i&&(this.#s=i.profile??void 0,this.#n=i.isEligible,this.requestUpdate())}};export{C as SyncSection};
//# sourceMappingURL=components.js.map
