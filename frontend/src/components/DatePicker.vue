<template lang="pug">
input#date-input(type="date" v-model="timeString" @change="update()")
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';

const props = defineProps<{
	modelValue: Date;
}>();
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
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');

	return `${date.getFullYear()}-${month}-${day}`;
}

function update() {
	emit('update:modelValue', timestamp.value);
	emit('change', timestamp.value);
}
</script>

<style scoped></style>
