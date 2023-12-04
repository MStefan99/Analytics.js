<template lang="pug">
input#date-input(
	:type="type === 'date' ? 'date' : 'datetime-local'"
	v-model="timeString"
	@change="update()")
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';

const props = withDefaults(
	defineProps<{
		modelValue: Date;
		type?: 'date' | 'time';
	}>(),
	{
		type: 'date'
	}
);
const emit = defineEmits<{
	(e: 'change', value: Date): void;
	(e: 'update:modelValue', value: Date): void;
}>();

const timestamp = computed<Date>(() => new Date(timeString.value));
const timeString = ref<string>(dateToString(props.modelValue));
watch(
	() => props.modelValue,
	() => (timeString.value = dateToString(props.modelValue))
);

function dateToString(date: Date): string {
	if (props.type === 'date') {
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');

		return `${date.getFullYear()}-${month}-${day}`;
	} else {
		return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, -8);
	}
}

function update() {
	emit('update:modelValue', timestamp.value);
	emit('change', timestamp.value);
}
</script>

<style scoped></style>
