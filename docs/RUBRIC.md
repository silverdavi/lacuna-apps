# Rubric

This file is generated from the program rubric. Do not edit it by hand.

Rules marked "advisory" for outside apps are reported but never block a pull request.

## A. Camera-ready

### A1. No clipped text

Nothing a person needs to read ends in an ellipsis: names, panel titles, file names, button labels. Wrap to two lines or widen the container.

- Measured as: 0 clipped labels at 1440 by 900
- Checked by: the camera check
- Applies to: first-party and outside apps

### A2. No clipped controls

No button, field or panel is cut by its container at any width from 360 to 1920 px. Panels scroll inside themselves before they overflow.

- Measured as: 0 clipped controls from 360 to 1920 px
- Checked by: the camera check
- Applies to: first-party and outside apps

### A3. No browser-default controls

Selects, checkboxes, radios, ranges, number, date and file inputs, and text areas are styled by the kit, with a visible focus ring.

- Measured as: 0 unstyled controls
- Checked by: the camera check
- Applies to: first-party and outside apps

### A4. Fields have a sensible width

A text field is never wider than 480 px, except one search or formula bar. A form is one column, at most 640 px wide.

- Measured as: field at most 480 px; form at most 640 px
- Checked by: the camera check
- Applies to: first-party and outside apps

### A5. Content does not float in a void

A screen that fills under half the window centres a reading column, fills the window, or shows an empty state with one action.

- Measured as: judged by a reviewer
- Checked by: a person
- Applies to: first-party and outside apps

### A6. One type scale

Sizes come from the tokens only. Mono is for labels and status, never for a sentence.

- Measured as: 0 sizes outside the tokens
- Checked by: the camera check
- Applies to: first-party and outside apps
- Advisory for: outside apps

### A7. Spacing on the 4 px grid

Spacing comes from the spacing tokens, so every gap and padding is a multiple of 4 px.

- Measured as: multiples of 4 px
- Checked by: the camera check
- Applies to: first-party and outside apps
- Advisory for: outside apps

### A8. Targets are big enough

Every pointer target is at least 28 px, and at least 40 px on a phone. Tab order follows reading order and Esc closes the top layer.

- Measured as: 28 px desktop; 40 px phone
- Checked by: the camera check
- Applies to: first-party and outside apps

### A9. Every state is designed

Loading, empty, error and denied each have a designed state. A blank rectangle is never one of them.

- Measured as: judged by a reviewer
- Checked by: a person
- Applies to: first-party and outside apps

### A10. Light and dark, phone and desktop

Each screen works in both themes and at 390 by 844. On a phone, side panels become sheets or tabs.

- Measured as: 2 themes; 4 sizes
- Checked by: the browser check
- Applies to: first-party and outside apps

## B. Copy

### B1. Plain words on screen

Copy is plain sentence case and says what a person cares about. It never talks about how the app is built.

- Measured as: 0 banned words
- Checked by: the camera check
- Applies to: first-party and outside apps
- Advisory for: outside apps

### B2. Every control does something

A button that does nothing is removed or made to work. A disabled control looks disabled and says why.

- Measured as: judged by a reviewer
- Checked by: a person
- Applies to: first-party and outside apps

## C. Code and assets

### C1. Types pass

The app type-checks with no errors.

- Measured as: 0 type errors
- Checked by: the types check
- Applies to: first-party and outside apps

### C2. Tokens only

Colours, sizes and spacing come from the kit tokens, never literal values.

- Measured as: 0 literal values
- Checked by: the tokens check
- Applies to: first-party and outside apps

### C3. Only allowed dependencies

Dependencies and their licences are on the allowlist. An outside pull request never changes the lockfile.

- Measured as: 0 dependencies off the list
- Checked by: the deps check
- Applies to: first-party and outside apps

### C4. No network or eval in source

The source makes no network calls and uses no eval or dynamic code.

- Measured as: 0 matches
- Checked by: the source-scan check
- Applies to: first-party and outside apps

### C5. No network or eval in the build

The built bundle makes no network calls and uses no eval or dynamic code.

- Measured as: 0 matches
- Checked by: the bundle-scan check
- Applies to: first-party and outside apps

### C6. Within the size limit

The app and its assets stay within the published size limit.

- Measured as: per the size policy
- Checked by: the size check
- Applies to: first-party and outside apps

### C7. Opens cleanly in a browser

The app opens at four sizes in light and dark, and any request to another origin fails the check.

- Measured as: 0 errors; 0 off-origin requests
- Checked by: the browser check
- Applies to: first-party and outside apps

### C8. Accessible

No serious or critical accessibility problems.

- Measured as: 0 serious or critical
- Checked by: the a11y check
- Applies to: first-party and outside apps

### C9. One app folder only

A pull request changes only the folder of its own app.

- Measured as: 0 files outside the app folder
- Checked by: the scope check
- Applies to: outside apps

## D. Permissions

### D1. Permissions stay inside the envelope

The manifest asks only for permissions the program allows.

- Measured as: 0 permissions outside the envelope
- Checked by: the manifest check
- Applies to: first-party and outside apps

### D2. Every declared permission is used

A reviewer confirms each declared permission is needed for the app's one job.

- Measured as: judged by a reviewer
- Checked by: a person
- Applies to: outside apps

## E. Manifest and credit

### E1. Manifest is complete and valid

No placeholders, no reserved slugs, an id in the right namespace, a folder that matches, and a slug that is a valid DNS label.

- Measured as: 0 manifest errors
- Checked by: the manifest check
- Applies to: outside apps

### E2. Owner matches the author

The GitHub id in the manifest is the id of the person who opened the pull request.

- Measured as: ids equal
- Checked by: the owner check
- Applies to: outside apps

### E3. Commits are signed off

Every commit carries a Signed-off-by line (DCO 1.1). A GitHub noreply address is fine.

- Measured as: every commit signed off
- Checked by: the dco check
- Applies to: outside apps

## F. Human judgement

### F1. One clear job

The app does one thing, and does what its summary says.

- Measured as: judged by the owner
- Checked by: a person
- Applies to: outside apps

### F2. Works with made-up data and is not a duplicate

The app is useful with made-up data and does not repeat an app that is already listed.

- Measured as: judged by the owner
- Checked by: a person
- Applies to: outside apps

### F3. Content limits and no dark patterns

Content stays within the published limits and nothing in the app pushes people into choices they did not mean to make.

- Measured as: judged by the owner
- Checked by: a person
- Applies to: outside apps
