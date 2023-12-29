'use strict';

import {createApp} from 'vue';
import App from './App.vue';
import router from './scripts/routes';
import {crashCourse} from './scripts/analytics';
import './assets/style.css';

const app = createApp(App);

app.config.errorHandler = (err: unknown): void => {
	console.error('Vue error', err);
	crashCourse.value?.sendLog(String(err), 3);
};

app.config.warnHandler = (err: unknown): void => {
	console.warn('Vue error', err);
	crashCourse.value?.sendLog(String(err), 2);
};

app.use(router).mount('#app');
