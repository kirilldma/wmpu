# Gamesense (Wumpus) Lua API Documentation

Welcome to the Gamesense custom script API for Wumpus Torture Simulator. This engine provides a robust JavaScript sandbox injected directly into the WebGL renderer and physics engine.

You can write scripts in the `LUA > Script Editor` tab in the cheat menu.

---

## 1. `client` (System & Execution)
*   `client.log(msg)`: Prints a green gamesense message to the browser console.
*   `client.color_log(r, g, b, msg)`: Prints a custom colored message to the console.
*   `client.delay_call(ms, callback)`: Executes a callback after `ms` milliseconds.
*   `client.set_event_callback(event, callback)`: Registers an event listener (`"paint"`).
*   `client.unset_event_callback(event, callback)`: Unregisters an event listener.
*   `client.screen_size()`: Returns `[width, height]`.
*   `client.system_time()`: Returns Unix timestamp in MS.
*   `client.timestamp()`: Returns high-resolution performance timestamp.

---

## 2. `input` (Keyboard & Mouse)
*   `input.key_state(key)`: Returns `true` if the specified key (e.g. "w", "space") is held down.
*   `input.mouse_pos()`: Returns `[x, y]` of the mouse cursor relative to the screen.
*   `input.is_mouse_down(button)`: Returns `true` if mouse button is held (0 = left, 1 = middle, 2 = right).

---

## 3. `http` (Network)
*   `http.get(url, callback)`: Makes a GET request and passes the text response to the callback.
*   `http.post(url, data_object, callback)`: Makes a JSON POST request and passes response to the callback.

---

## 4. `math` (Geometry & Vectors)
*   `math.distance(x1, y1, x2, y2)`: Returns 2D distance.
*   `math.distance3d(x1, y1, z1, x2, y2, z2)`: Returns 3D distance.
*   `math.clamp(val, min, max)`: Clamps a value.
*   `math.lerp(a, b, t)`: Linear interpolation.
*   `math.random_float(min, max)`: Random float between min and max.
*   `math.random_int(min, max)`: Random integer between min and max.

---

## 5. `camera` (Viewport Control)
*   `camera.get_pos()`: Returns `[x, y, z]` of the camera.
*   `camera.get_rot()`: Returns `[pitch, yaw, roll]` in radians.
*   `camera.get_fov()`: Returns current FOV.
*   `camera.set_fov(fov)`: Overrides the camera FOV (zoom).

---

## 6. `visuals` (World & Materials)
*   `visuals.set_wireframe(boolean)`: Turns all meshes in the world into wireframe outlines.
*   `visuals.set_wumpus_color(r, g, b)`: Changes the color of Wumpus materials.

---

## 7. `world` (Physics Global)
*   `world.raycast(x,y,z, dx,dy,dz, dist)`: Performs a physics raycast. Returns `{hit: bool, dist: number, normal: {x,y,z}}`.
*   `world.set_gravity(x, y, z)`: Changes the global gravity direction/strength.

---

## 8. `audio`
*   `audio.play(soundName, volume)`: Plays an internal game sound (e.g., `'thud'`) at the specified volume.

---

## 9. `globals` (Engine State)
*   `globals.realtime()`: Total time in seconds since injection.
*   `globals.frametime()`: Current frame time (delta).
*   `globals.tickcount()`: Current engine tick.
*   `globals.mapname()`: Returns `"wumpus_torture_chamber"`.
*   `globals.maxplayers()`: Returns `1`.

---

## 10. `render` (Drawing Overlay)
*   `render.text(x, y, r, g, b, a, text)`: Draws text at the specified coordinates.
*   `render.text_size(text)`: Returns `[width, height]` for the given text.
*   `render.line(x1, y1, x2, y2, r, g, b, a, thickness)`: Draws a 2D line.
*   `render.rect(x, y, w, h, r, g, b, a)`: Draws a rectangle outline.
*   `render.rect_filled(x, y, w, h, r, g, b, a)`: Draws a filled rectangle.
*   `render.gradient(x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, vertical)`: Draws a color gradient.
*   `render.circle(x, y, radius, r, g, b, a)`: Draws a circle outline.
*   `render.world_to_screen(x, y, z)`: Projects 3D world coordinates into 2D screen coordinates. Returns `{x, y}` or `null`.

---

## 11. `ui` (Custom Menu Elements)
*   `ui.new_checkbox(tab, group, label)`: Creates a checkbox.
*   `ui.new_slider(tab, group, label, min, max, default_val)`: Creates a slider.
*   `ui.new_combobox(tab, group, label, option1, option2, ...)`: Creates a dropdown.
*   `ui.new_button(tab, group, label, callback)`: Creates a clickable button.
*   `ui.new_label(tab, group, label)`: Creates a text label in the menu.
*   `ui.get(id)`: Returns the current value of a UI element.
*   `ui.set(id, value)`: Updates the value of a UI element programmatically.
*   `ui.set_visible(id, boolean)`: Shows or hides the UI element dynamically.
*   `ui.set_callback(id, callback)`: Registers a function to execute when the element's value changes.

---

## 12. `wumpus` (Physics Manipulation)

The Wumpus has multiple physical segments and joints.
**Segments:** `head`, `torso`, `pelvis`, `armL`, `armR`, `foreL`, `foreR`, `legL`, `legR`, `footL`, `footR`.
**Joints:** `neck`, `waist`, `shoulderL`, `shoulderR`, `elbowL`, `elbowR`, `hipL`, `hipR`, `kneeL`, `kneeR`.

### Core Wrappers
*   `wumpus.reset()`: Respawns Wumpus.
*   `wumpus.get_coins()` / `wumpus.add_coins(amount)`: Manages economy.
*   `wumpus.set_pose(poseName)`: Sets visual pose (`"idle"`, `"flop"`, `"jerk"`, `"twerk"`).
*   `wumpus.trigger_damage(segment, force)`: Triggers the damage particle/blood event.

### Dynamic Segment API (Generated)
For every **segment** (e.g. `head`, `armL`), the following functions exist:
*   `wumpus.get_[segment]_pos()`: Returns `{x, y, z}`.
*   `wumpus.get_[segment]_vel()`: Returns linear velocity.
*   `wumpus.set_[segment]_vel(x, y, z)`: Hard-sets linear velocity.
*   `wumpus.get_[segment]_angvel()`: Returns angular velocity.
*   `wumpus.set_[segment]_angvel(x, y, z)`: Hard-sets angular velocity.
*   `wumpus.apply_[segment]_impulse(x, y, z)`: Pushes the segment instantly.
*   `wumpus.apply_[segment]_torque(x, y, z)`: Twists the segment instantly.
*   `wumpus.set_[segment]_rot(x, y, z, w)`: Hard-sets quaternion rotation.
*   `wumpus.is_[segment]_enabled()`: Checks if body is active.
*   `wumpus.wake_[segment]()`: Forces body to wake up from physics sleep.
*   `wumpus.sleep_[segment]()`: Forces body to stop moving.

### Dynamic Joint API (Generated)
For every **joint** (e.g. `neck`, `waist`), the following functions exist:
*   `wumpus.sever_[joint]()`: Instantly rips off the limb.
*   `wumpus.is_severed_[joint]()`: Returns boolean.
*   `wumpus.get_[joint]_rot()`: Returns Three.js Euler rotation (visual only).
*   `wumpus.set_[joint]_rot(x, y, z)`: Hard-sets visual rotation.

---

## 13. `entity` (Miscellaneous)
*   `entity.get_all()`: Returns array `['wumpus']`.
*   `entity.get_local_player()`: Returns `'wumpus'`.
*   `entity.is_alive()`: Returns `true` if Wumpus is standing.
