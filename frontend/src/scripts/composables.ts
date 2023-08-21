import {Ref, ref, watch} from 'vue';
import {LocationQuery, useRoute, useRouter} from 'vue-router';

export function useQuery<T extends LocationQuery>(q?: Ref<T>) {
	const router = useRouter();
	const route = useRoute();
	const query: Ref<LocationQuery> = ref(Object.keys(route.query).length ? route.query : q);

	watch(q, () => {
		query.value = q.value;
		router.replace({name: route.name, query: query.value});
	});

	return {query};
}
