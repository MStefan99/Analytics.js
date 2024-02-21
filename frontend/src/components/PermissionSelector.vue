<template lang="pug">
div
	div(v-for="permission in permissionKeys" :key="permission")
		input(
			type="checkbox"
			:id="'permission-' + permission"
			:value="permission"
			v-model="permissions"
			:disabled="allowed && !hasPermissions([permission], allowed)")
		label.inline(:for="'permission-' + permission") {{permissionDescriptions[permission]}}
</template>

<script setup lang="ts">
import {
	encodePermissions,
	hasPermissions,
	parsePermissions,
	permissionDescriptions,
	PERMISSIONS
} from '../../../common/permissions';
import {computed, ref, watch} from 'vue';

const props = defineProps<{modelValue: number; allowed?: number}>();
const emit = defineEmits<{(e: 'update:modelValue', permissions: number): void}>();

const permissions = ref<PERMISSIONS[]>(parsePermissions(props.modelValue));
const permissionKeys = computed<PERMISSIONS[]>(() =>
	Object.keys(PERMISSIONS)
		.filter((k) => !isNaN(+k))
		.map((k) => +k)
);

watch(
	() => props.modelValue,
	() => (permissions.value = parsePermissions(props.modelValue))
);

watch(permissions, () => {
	emit('update:modelValue', encodePermissions(permissions.value));
});
</script>

<style scoped>
input {
	@apply mr-2;
}
</style>
