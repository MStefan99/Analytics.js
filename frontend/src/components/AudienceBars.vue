<template lang="pug">
Bar(:data="chartData")
</template>

<script setup lang="ts">
//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import {Bar} from 'vue-chartjs';

import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	BarElement,
	CategoryScale,
	LinearScale
	//eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-ignore
} from 'chart.js';
import {computed, ref} from 'vue';

const props = defineProps<{data: {[key: string]: number}}>();
const sessionLength = 60 * 1000;
const startTime = Date.now() - (Date.now() % sessionLength) - sessionLength * 29;

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
ChartJS.defaults.color = '#ffffff';

const labels = [];
for (let i = 0; i < 29; ++i) {
	labels.push(30 - i + ' min');
}

const chartData = ref({
	labels,
	datasets: [
		{
			label: 'Sessions',
			backgroundColor: '#44c40c',
			data: computed(() => {
				const data = new Array(30);

				for (let i = 0; i < 30; ++i) {
					data[i] = props.data[startTime + sessionLength * i] ?? 0;
				}

				return data;
			})
		}
	]
});
</script>

<style scoped></style>
