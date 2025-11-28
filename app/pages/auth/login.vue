<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const route = useRoute()
const redirectUrl = route.query.url || '/';

const toast = useToast();

const fields: AuthFormField[] = [{
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: 'Enter your username',
    required: true
}, {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true
}, {
    name: 'remember',
    label: 'Remember me',
    type: 'checkbox'
}]

const schema = z.object({
    username: z.string('Username is required'),
    password: z.string('Password is required').min(8, 'Must be at least 8 characters')
});

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {

    const result = await useAPI().postAuthLogin({ body: payload.data });
    
    if (result.success) {
        
        updateAPIClient(result.data.token);

        const sessionToken = useCookie('session_token', {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax'
        });

        sessionToken.value = result.data.token;

        SessionStore.setUserInfo(result.data);

        toast.add({
            title: 'Login Successful',
            description: 'You have been logged in successfully.'
        });
        
        await navigateTo(redirectUrl.toString());
        return;

    } else {
        toast.add({
            title: 'Login Failed',
            description: 'An error occurred during login.'
        });
    }
}

</script>

<template>
    <div class="flex flex-col items-center justify-center gap-4 p-4">
        <UPageCard class="w-full max-w-md">
            <UAuthForm :schema="schema" title="Login" description="Enter your credentials to access your account."
                icon="i-lucide-user" :fields="fields" @submit="onSubmit" />
        </UPageCard>
    </div>
</template>
