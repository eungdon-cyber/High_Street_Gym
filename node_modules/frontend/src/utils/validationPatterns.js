// Name validation: must start with a letter, followed by letters, numbers, spaces, hyphens, apostrophes, or commas
export const namePattern = /^[a-zA-Z][a-zA-Z0-9\-'\ ,]{0,}$/
// Email validation: standard email format (user@domain.tld)
export const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
// Password validation: minimum 4 characters
export const passwordPattern = /^.{4,}$/
// Blog title validation: must start with a letter, followed by letters, numbers, spaces, hyphens, apostrophes, commas, periods, exclamation marks, or question marks
export const blogTitlePattern = /^[a-zA-Z][a-zA-Z0-9\-\'\ \.,!?]{0,}$/
// Blog content validation: must start with a letter, followed by letters, numbers, spaces, hyphens, apostrophes, commas, periods, exclamation marks, or question marks
export const blogContentPattern = /^[a-zA-Z][a-zA-Z0-9\-\'\ \.,!?]{0,}$/

