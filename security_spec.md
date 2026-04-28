# Security Specification for Pixelgram

## 1. Data Invariants
- A `Post` must have a valid `authorId` matching the authenticated user.
- `isProduct` and `price` are set at creation and currently immutable in this version.
- A `Like` can only be created by the authenticated user for themselves (`userId` matches `auth.uid`).
- A `Follow` relationship must have `followerId` matching the authenticated user.
- Users cannot modify other users' profiles.
- Posts are immutable except for their `likesCount` (which is usually handled by increment logic or separate collection). In this design, we'll use a `likes` subcollection and potentially a cloud function or client-side batch to update counts. For simplicity in this demo, the client will manage the count or we will rely on subcollection size in queries if supported (Firestore doesn't support subcollection size in rules easily without increments). I will enforce `likesCount` updates only via specific actions.

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Theft**: Creating a post with `authorId` = "someone_else".
2. **Ghost Profile**: Creating a user profile with `uid` != `auth.uid`.
3. **Like Spoofing**: Creating a like for post A but setting `userId` to "target_user".
4. **Follow Hijacking**: Creating a follow record where `followerId` is not the current user.
5. **Caption Injection**: Updating a post caption from a non-author account.
6. **Like Count Manipulation**: Incrementing `likesCount` by 1000 in a single update.
7. **Bio Vandalism**: Updating another user's bio.
8. **ID Poisoning**: Using a 2MB string as a `userId` or `postId`.
9. **Timestamp Fraud**: Setting `createdAt` to a future date instead of `request.time`.
10. **Shadow Field**: Adding `isVerified: true` to a user profile payload.
11. **Mass Delete**: Attempting to delete a post as a non-author.
12. **Recursive Follow**: Making a user follow themselves (if blocked by app logic).

## 3. Test Runner (Draft Logic)
The `DRAFT_firestore.rules` will verify:
- `create`: `request.resource.data.authorId == request.auth.uid`
- `update`: `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['bio', 'displayName', 'photoURL'])`
- `delete`: `resource.data.authorId == request.auth.uid`
