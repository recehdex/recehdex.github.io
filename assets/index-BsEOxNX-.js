import{aV as h,aS as d,aH as c,aT as l,aA as x,a_ as b,az as g,a$ as v,aX as C,aP as m,aQ as _,aR as $}from"./index-LURuJBM1.js";import{c as w,r as T}from"./index-YI5TwgFv.js";import"./index-BJDC97vK.js";const R=h``;var P=function(n,e,r,o){var i=arguments.length,t=i<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,r):o,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")t=Reflect.decorate(n,e,r,o);else for(var s=n.length-1;s>=0;s--)(a=n[s])&&(t=(i<3?a(t):i>3?a(e,r,t):a(e,r))||t);return i>3&&t&&Object.defineProperty(e,r,t),t};let f=class extends d{render(){const{termsConditionsUrl:e,privacyPolicyUrl:r}=c.state;return!e&&!r?null:l`
      <wui-flex
        .padding=${["4","3","3","3"]}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <wui-text color="secondary" variant="md-regular" align="center">
          We work with the best providers to give you the lowest fees and best support. More options
          coming soon!
        </wui-text>

        ${this.howDoesItWorkTemplate()}
      </wui-flex>
    `}howDoesItWorkTemplate(){return l` <wui-link @click=${this.onWhatIsBuy.bind(this)}>
      <wui-icon size="xs" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
      How does it work?
    </wui-link>`}onWhatIsBuy(){x.sendEvent({type:"track",event:"SELECT_WHAT_IS_A_BUY",properties:{isSmartAccount:b(g.state.activeChain)===v.ACCOUNT_TYPES.SMART_ACCOUNT}}),C.push("WhatIsABuy")}};f.styles=[R];f=P([w("w3m-onramp-providers-footer")],f);const O="https://reown.com",U=m`
  .reown-logo {
    height: 24px;
  }

  a {
    text-decoration: none;
    cursor: pointer;
    color: ${({tokens:n})=>n.theme.textSecondary};
  }

  a:hover {
    opacity: 0.9;
  }
`;var W=function(n,e,r,o){var i=arguments.length,t=i<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,r):o,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")t=Reflect.decorate(n,e,r,o);else for(var s=n.length-1;s>=0;s--)(a=n[s])&&(t=(i<3?a(t):i>3?a(e,r,t):a(e,r))||t);return i>3&&t&&Object.defineProperty(e,r,t),t};let p=class extends d{render(){return l`
      <a
        data-testid="ux-branding-reown"
        href=${O}
        rel="noreferrer"
        target="_blank"
        style="text-decoration: none;"
      >
        <wui-flex
          justifyContent="center"
          alignItems="center"
          gap="1"
          .padding=${["01","0","3","0"]}
        >
          <wui-text variant="sm-regular" color="inherit"> UX by </wui-text>
          <wui-icon name="reown" size="inherit" class="reown-logo"></wui-icon>
        </wui-flex>
      </a>
    `}};p.styles=[_,$,U];p=W([w("wui-ux-by-reown")],p);const B=m`
  :host wui-ux-by-reown {
    padding-top: 0;
  }

  :host wui-ux-by-reown.branding-only {
    padding-top: ${({spacing:n})=>n[3]};
  }

  a {
    text-decoration: none;
    color: ${({tokens:n})=>n.core.textAccentPrimary};
    font-weight: 500;
  }
`;var y=function(n,e,r,o){var i=arguments.length,t=i<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,r):o,a;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")t=Reflect.decorate(n,e,r,o);else for(var s=n.length-1;s>=0;s--)(a=n[s])&&(t=(i<3?a(t):i>3?a(e,r,t):a(e,r))||t);return i>3&&t&&Object.defineProperty(e,r,t),t};let u=class extends d{constructor(){super(),this.unsubscribe=[],this.remoteFeatures=c.state.remoteFeatures,this.unsubscribe.push(c.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){const{termsConditionsUrl:e,privacyPolicyUrl:r}=c.state,o=c.state.features?.legalCheckbox;return!e&&!r||o?l`
        <wui-flex flexDirection="column"> ${this.reownBrandingTemplate(!0)} </wui-flex>
      `:l`
      <wui-flex flexDirection="column">
        <wui-flex .padding=${["4","3","3","3"]} justifyContent="center">
          <wui-text color="secondary" variant="md-regular" align="center">
            By connecting your wallet, you agree to our <br />
            ${this.termsTemplate()} ${this.andTemplate()} ${this.privacyTemplate()}
          </wui-text>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `}andTemplate(){const{termsConditionsUrl:e,privacyPolicyUrl:r}=c.state;return e&&r?"and":""}termsTemplate(){const{termsConditionsUrl:e}=c.state;return e?l`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Terms of Service</a
    >`:null}privacyTemplate(){const{privacyPolicyUrl:e}=c.state;return e?l`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Privacy Policy</a
    >`:null}reownBrandingTemplate(e=!1){return this.remoteFeatures?.reownBranding?e?l`<wui-ux-by-reown class="branding-only"></wui-ux-by-reown>`:l`<wui-ux-by-reown></wui-ux-by-reown>`:null}};u.styles=[B];y([T()],u.prototype,"remoteFeatures",void 0);u=y([w("w3m-legal-footer")],u);
