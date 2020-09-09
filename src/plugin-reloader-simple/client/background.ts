/* eslint-env browser */
/* globals chrome */

import {
  loadMessagePlaceholder,
  timestampPathPlaceholder,
} from '../CONSTANTS'

import { code } from 'code ./content.ts'

// Log load message to browser dev console
console.log(loadMessagePlaceholder.slice(1, -1))

// Modify chrome.tabs.executeScript to inject reloader
const _executeScript = chrome.tabs.executeScript
chrome.tabs.executeScript = (...args: any): void => {
  const tabId = typeof args[0] === 'number' ? args[0] : null

  // execute reloader
  const reloaderArgs = (tabId === null
    ? ([] as any[])
    : ([tabId] as any[])
  ).concat([
    { code },
    () => {
      // execute original script
      _executeScript(...(args as [any, any, any]))
    },
  ])

  _executeScript(...(reloaderArgs as [any, any, any]))
}

let timestamp: number | undefined

const id = setInterval(async () => {
  const t = await fetch(timestampPathPlaceholder)
    .then((res) => {
      localStorage.removeItem('chromeExtensionReloaderErrors')
      return res.json()
    })
    .catch(handleFetchError)

  if (typeof timestamp === 'undefined') {
    timestamp = t
  } else if (timestamp !== t) {
    chrome.runtime.reload()
  }

  function handleFetchError(error: any) {
    clearInterval(id)

    const errors =
      localStorage.chromeExtensionReloaderErrors || 0

    if (errors < 5) {
      localStorage.chromeExtensionReloaderErrors = errors + 1

      // Should reload at least once if fetch fails.
      // The fetch will fail if the timestamp file is absent,
      // thus the new build does not include the reloader
      return 0
    } else {
      console.log(
        'rollup-plugin-chrome-extension simple reloader error:',
      )
      console.error(error)

      return timestamp
    }
  }
}, 1000)
