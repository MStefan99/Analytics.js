<template lang="pug">
select(@change="select($el.selectedIndex)")
	option(v-for="(option, i) in options" :key="option" :selected="i === modelValue") {{option}}
</template>

<script setup lang="ts">
import {ref} from 'vue';

defineProps<{
	options: string[];
	modelValue?: number;
}>();
const emit = defineEmits<{
	(e: 'change', value: number): void;
	(e: 'update:modelValue', value: number): void;
}>();

const selectedIndex = ref<number | null>(null);

function select(index: number): void {
	selectedIndex.value = index;
	emit('update:modelValue', index);
	emit('change', index);
}
</script>

<style scoped></style>
