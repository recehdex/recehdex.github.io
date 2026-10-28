import{aV as c,aQ as m,aS as f,aT as d}from"./index-LURuJBM1.js";import{n as u,c as b,o as h}from"./index-YI5TwgFv.js";import"./index-Cxr9CMOL.js";const v=c`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }
`;var o=function(a,i,r,l){var s=arguments.length,e=s<3?i:l===null?l=Object.getOwnPropertyDescriptor(i,r):l,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")e=Reflect.decorate(a,i,r,l);else for(var p=a.length-1;p>=0;p--)(n=a[p])&&(e=(s<3?n(e):s>3?n(i,r,e):n(i,r))||e);return s>3&&e&&Object.defineProperty(i,r,e),e};let t=class extends f{constructor(){super(...arguments),this.disabled=!1}render(){return d`
      <wui-input-text
        type="email"
        placeholder="Email"
        icon="mail"
        size="lg"
        .disabled=${this.disabled}
        .value=${this.value}
        data-testid="wui-email-input"
        tabIdx=${h(this.tabIdx)}
      ></wui-input-text>
      ${this.templateError()}
    `}templateError(){return this.errorMessage?d`<wui-text variant="sm-regular" color="error">${this.errorMessage}</wui-text>`:null}};t.styles=[m,v];o([u()],t.prototype,"errorMessage",void 0);o([u({type:Boolean})],t.prototype,"disabled",void 0);o([u()],t.prototype,"value",void 0);o([u()],t.prototype,"tabIdx",void 0);t=o([b("wui-email-input")],t);
