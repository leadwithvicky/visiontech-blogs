# Migration to Pure Next.js Site

## Overview
Convert the entire site to use pure Next.js code, eliminating any separate Node.js backend. Ensure all backend logic is integrated into Next.js API routes with best practices.

## Current Status
- Frontend: Next.js app with App Router
- Backend logic: Partially migrated to `src/lib/newsletterBackend.js` and API routes
- Backend folder: Exists but inaccessible; assume deprecated after full migration

## Migration Steps

### 1. Backend Logic Migration
- [ ] Review backend folder files (models, routes, services) and migrate any missing logic to frontend
- [ ] Ensure all models (Newsletter, Subscriber, Analytics) are in `src/lib/newsletterBackend.js`
- [ ] Migrate email service, auth, and database connection to frontend
- [ ] Update API routes to use migrated logic

### 2. API Routes Refactoring (Best Practices)
- [ ] Ensure all API routes use TypeScript
- [ ] Add proper error handling and validation
- [ ] Use `runtime = 'nodejs'` for server-side operations
- [ ] Implement rate limiting and security headers
- [ ] Add logging and monitoring

### 3. Frontend Pages and Components
- [ ] Convert any remaining Pages Router files to App Router
- [ ] Update API calls to use Next.js API routes (remove external backend calls)
- [ ] Implement proper loading states and error boundaries
- [ ] Add TypeScript types for API responses
- [ ] Optimize for performance (ISR, SSG where applicable)

### 4. Configuration and Environment
- [ ] Update `next.config.ts` for production optimizations
- [ ] Ensure environment variables are properly configured
- [ ] Add database connection pooling and caching
- [ ] Configure CORS and security settings

### 5. Testing and Validation
- [ ] Test all API routes functionality
- [ ] Verify newsletter creation, subscription, and email sending
- [ ] Test admin login and dashboard
- [ ] Ensure mobile responsiveness and accessibility
- [ ] Performance testing and optimization

### 6. Cleanup
- [ ] Remove backend folder after migration
- [ ] Remove unused dependencies
- [ ] Update package.json scripts
- [ ] Add deployment configuration

## Best Practices to Implement
- Use TypeScript throughout
- Implement proper error handling
- Add input validation and sanitization
- Use environment variables for secrets
- Implement caching and optimization
- Add logging and monitoring
- Ensure accessibility and SEO
- Use modern React patterns (hooks, context)
- Implement proper state management if needed
- Add unit and integration tests

## Dependencies to Review
- Mongoose for database
- Nodemailer for emails
- JWT for authentication
- Cloudinary for image uploads
- Axios for API calls (replace with fetch)
- React Quill for rich text editing

## Timeline
- Phase 1: Backend migration (1-2 days)
- Phase 2: API refactoring (1 day)
- Phase 3: Frontend updates (2-3 days)
- Phase 4: Testing and optimization (1-2 days)
- Phase 5: Cleanup and deployment (1 day)
