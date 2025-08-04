import { createApp } from 'vue';
import App from './App.vue';
import './style.scss';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import router from './router';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import InlineSvg from 'vue-inline-svg';

const pinia = createPinia();

const app = createApp(App);
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}
app.component('inline-svg', InlineSvg);
app.use(router);
app.use(ElementPlus);
app.use(pinia);
app.mount('#app');
