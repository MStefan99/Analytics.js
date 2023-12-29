<template lang="pug">
.chart.relative(ref="container")
	Bar(v-if="type === 'bar'" :data="chartData" :options="options" ref="chart")
	Line(v-else :data="chartData" :options="options" ref="chart")
</template>

<script setup lang="ts">
//@ts-ignore
import {Bar, Line} from 'vue-chartjs';

import {
	BarElement,
	CategoryScale,
	Chart as ChartJS,
	Filler,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	TimeScale,
	Title,
	Tooltip
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {computed, onUnmounted, ref} from 'vue';

const props = withDefaults(
	defineProps<{
		data: {label: string; color: string; data: {[key: string]: number}}[] | undefined;
		type?: 'bar' | 'line';
		xStacked?: boolean;
		yStacked?: boolean;
		stepSize?: number;
		min?: number;
		max?: number;
		suggestedMin?: number;
		suggestedMax?: number;
		color?: string;
		overview?: boolean;
	}>(),
	{
		type: 'bar',
		xStacked: true,
		yStacked: true
	}
);

const emit = defineEmits<{(e: 'click', value: number): void}>();

ChartJS.register(
	Title,
	Tooltip,
	Legend,
	BarElement,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	TimeScale,
	Filler
);

const units = [
	{length: 1000, name: 'sec'},
	{length: 1000 * 60, name: 'min'},
	{length: 1000 * 60 * 60, name: 'hours'},
	{length: 1000 * 60 * 60 * 24, name: 'days'},
	{length: 1000 * 60 * 60 * 24 * 30, name: 'months'}
];
const container = ref(null);
const chart = ref(null);
const steps = computed(() => {
	const now = Date.now();
	return Math.floor(
		(now -
			props.data
				.filter((d) => (d?.data ? Object.keys(d.data).length : false))
				.reduce<number>(
					(min, curr) =>
						Math.min(
							min,
							Object.keys(curr.data).reduce<number>((m, c) => Math.min(m, +c), now)
						),
					now
				)) /
			props.stepSize
	);
});
const labels = computed(() => {
	const array = [];
	const unit = units
		.slice()
		.reverse()
		.find((u) => u.length <= props.stepSize);
	const unitMultiplier = props.stepSize / unit.length;
	for (let i = 0; i <= steps.value; ++i) {
		const step = (steps.value - i) * unitMultiplier;
		array.push((step % 1 === 0 ? step : step.toFixed(2)) + ' ' + unit.name);
	}
	return array;
});

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

		if (container.value.parentNode.clientWidth > size.width) {
			return; // Size is probably already fine
		}

		console.log('Chart resize loop detected, attempting to fix');
		const computedStyle = window.getComputedStyle(container.value.parentNode);
		container.value.parentNode.style.width =
			container.value.parentNode.clientWidth -
			parseFloat(computedStyle.paddingLeft) -
			parseFloat(computedStyle.paddingRight) +
			'px';

		// Attempting again if everything else failed
		container.value.parentNode.clientWidth < size.width &&
			setTimeout(() => {
				options.value.onResize(c, {
					width: container.value.parentNode.clientWidth,
					height: size.height
				});
			});
	},
	interaction: {
		intersect: true,
		mode: 'index'
	},
	scales: {
		x: {
			ticks: {color: props.color ?? '#000'},
			stacked: props.xStacked,
			...(props.stepSize === undefined && {
				type: 'time',
				time: {
					displayFormats: {
						millisecond: 'hh:mm:ss',
						second: 'hh:mm:ss',
						minute: 'hh:mm:ss',
						hour: 'MMM dd h:mm',
						day: 'MMM d',
						week: 'MMM d',
						month: 'YYYY MMM',
						quarter: 'YYYY MMM',
						year: 'YYYY MMM'
					}
				}
			}),
			...(props.overview && {grid: {display: false}, ticks: {display: false}})
		},
		y: {
			ticks: {color: props.color ?? '#000'},
			stacked: props.yStacked,
			min: props.min,
			max: props.max,
			suggestedMin: props.suggestedMin,
			suggestedMax: props.suggestedMax,
			...(props.overview && {grid: {display: false}})
		}
	},
	onClick(e: unknown, elements: {index: number; datasetIndex: number}[]) {
		if (!elements.length) {
			return;
		}

		const time = props.stepSize
			? Date.now() - (labels.value.length - 1 - elements[0].index) * props.stepSize
			: (
					chartData.value.datasets[elements[0].datasetIndex].data[elements[0].index] as {
						x: number;
						y: number;
					}
				).x;

		elements.length && emit('click', time);
	},
	plugins: {
		legend: {labels: {color: props.color ?? '#000'}, ...(props.overview && {display: false})},
		...(props.type === 'line' && {tooltip: {mode: 'index', intersect: false, position: 'nearest'}})
	}
});

const chartData = computed(() => {
	if (props.stepSize === undefined) {
		const datasets: {
			label: string;
			backgroundColor: string;
			data: {x: number; y: number}[];
		}[] = props.data.map((series) => ({
			label: series.label,
			backgroundColor: props.type === 'line' ? transparentize(series.color, 0.35) : series.color,
			data: Object.keys(series.data ?? {}).map((k) => ({x: +k, y: series.data[k]})),
			tension: 0.4,
			borderColor: series.color,
			fill: 'origin'
		}));

		return {datasets};
	} else {
		const datasets: {label: string; backgroundColor: string; data: number[]}[] = [];
		const now = Date.now();

		for (const series of props.data) {
			const dataset = {
				label: series.label,
				backgroundColor: props.type === 'line' ? transparentize(series.color, 0.35) : series.color,
				data: new Array(steps.value + 1).fill(0),
				tension: 0.4,
				borderColor: series.color,
				fill: 'origin'
			};

			if (series.data) {
				for (const time of Object.keys(series.data)) {
					const minutes = steps.value - Math.floor((now - +time) / props.stepSize);

					if (minutes <= steps.value * props.stepSize) {
						dataset.data[minutes] = series.data[time];
					}
				}
			}

			datasets.push(dataset);
		}

		return {
			labels: labels.value,
			datasets
		};
	}
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
