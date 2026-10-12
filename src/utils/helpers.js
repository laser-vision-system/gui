// check if a value is left empty by the user.
export function isBlank(v) {
  return v === '' || v === null || v === undefined || Number.isNaN(v);
}
// check for empty value if empty return the current value if not return the newValue from form.
export function checkBlank(newValue, currentValue) {
  return isBlank(newValue) ? currentValue : newValue;
}
