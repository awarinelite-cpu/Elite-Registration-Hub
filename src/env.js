import { defineEnvVars } from '@sveltejs/kit/env';

// SvelteKit 3 only exposes environment variables that are declared here.
// Both are optional: until they are set, photo/document upload fields stay hidden.
const optional = (value) => (value && value.trim() ? value.trim() : undefined);

export const variables = defineEnvVars({
	PUBLIC_CLOUDINARY_CLOUD_NAME: { public: true, schema: optional, description: 'Cloudinary cloud name' },
	PUBLIC_CLOUDINARY_UPLOAD_PRESET: { public: true, schema: optional, description: 'Cloudinary UNSIGNED upload preset name' }
});
