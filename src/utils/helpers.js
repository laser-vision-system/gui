//  This utils purpose is to promote code reuse
// These are basic helper functions that are used by multiple components
// If a function uses vue methods they should be made into a composable

// check if a value is left empty by the user.
export function isBlank(v) {
  return v === '' || v === null || v === undefined || Number.isNaN(v);
}

// check for empty value if empty return the current value if not return the newValue from form.
export function checkBlank(newValue, currentValue) {
  return isBlank(newValue) ? currentValue : newValue;
}

// checks if a JS object is empty and returns a bool
export function isEmpty(obj) {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) return false;
  }
  return true;
}
