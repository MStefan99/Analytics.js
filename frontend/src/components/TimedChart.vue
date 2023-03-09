<template lang="pug">
.chart.relative(ref="chart")
	Line(v-if="area" :data="chartData" :options="options")
	Bar(v-else :data="chartData" :options="options")
</template>

<script setup lang="ts">
//@ts-ignore
import {Bar, Line} from 'vue-chartjs';

import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	BarElement,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Filler
	//@ts-ignore
} from 'chart.js';
import {computed, onUnmounted, ref} from 'vue';

const props = defineProps<{
	data: {label: string; color: string; data: {[key: string]: number}}[] | undefined;
	area?: true;
	min?: number;
	max?: number;
	suggestedMin?: number;
	suggestedMax?: number;
	color?: string;
}>();
const minuteLength = 60 * 1000;
const showMinutes = 30;

ChartJS.register(
	Title,
	Tooltip,
	Legend,
	BarElement,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Filler
);
const chart = ref(null);
let lastResize = Date.now();

function updateResized() {
	lastResize = Date.now();
}

window.addEventListener('resize', updateResized);
onUnmounted(() => window.removeEventListener('resize', updateResized));

const options = ref({
	responsive: true,
	maintainAspectRatio: false,
	onResize(c: unknown, size: {width: number; height: number}) {
		// Attempts to fix Chart.js resize flickering
		// TODO: might not work in all situations
		if (Date.now() - lastResize < 20) {
			return; // Regular window resize
		}

		if (chart.value.parentNode.clientWidth > size.width) {
			return; // Size is probably already fine
		}

		console.log('Chart resize loop detected, attempting to fix');
		const computedStyle = window.getComputedStyle(chart.value.parentNode);
		chart.value.parentNode.style.width =
			chart.value.parentNode.clientWidth -
			parseFloat(computedStyle.paddingLeft) -
			parseFloat(computedStyle.paddingRight) +
			'px';

		// Attempting again if everything else failed
		chart.value.parentNode.clientWidth < size.width &&
			setTimeout(() => {
				options.value.onResize(c, {width: chart.value.parentNode.clientWidth, height: size.height});
			});
	},
	scales: {
		x: {stacked: true, ticks: {color: props.color ?? '#000'}},
		y: {
			stacked: true,
			ticks: {color: props.color ?? '#000'},
			min: props.min,
			max: props.max,
			suggestedMin: props.suggestedMin,
			suggestedMax: props.suggestedMax
		}
	},
	plugins: {legend: {labels: {color: props.color ?? '#000'}}}
});
const labels: string[] = [];
for (let i = 0; i <= showMinutes; ++i) {
	labels.push(showMinutes - i + ' min');
}

const chartData = computed(() => {
	const datasets: {label: string; backgroundColor: string; data: number[]}[] = [];
	const now = Date.now();

	for (const series of props.data) {
		const dataset = {
			label: series.label,
			backgroundColor: props.area ? transparentize(series.color, 0.35) : series.color,
			data: new Array(showMinutes + 1).fill(0),
			tension: 0.4,
			borderColor: series.color,
			fill: 'origin'
		};

		if (series.data) {
			for (const time of Object.keys(series.data)) {
				const minutes = showMinutes - Math.floor((now - +time) / minuteLength);

				if (minutes <= showMinutes * minuteLength) {
					dataset.data[minutes] = series.data[time];
				}
			}
		}

		datasets.push(dataset);
	}

	return {
		labels,
		datasets
	};
});

function transparentize(color: string, opacity: number): string {
	opacity = opacity < 0 ? 0 : opacity > 1 ? 1 : opacity;

	if (color.match(/^#[0-9a-fA-F]{3}$/)) {
		return color + Math.floor(opacity * 0xf).toString(16);
	} else if (color.match(/^#[0-9a-fA-F]{6}$/)) {
		return color + Math.floor(opacity * 0xff).toString(16);
	} else {
		return color;
	}
}
</script>

<style scoped></style>
