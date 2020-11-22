import { Uploader } from './uploader'
import { UploadTask } from './uploader/modules/UploadTask'
import { UploadFile, FileChunk } from './uploader/modules'
import { EventType, ID } from './types'
import * as $ from 'jquery'
import { ajax } from 'rxjs/ajax'
import { Observable } from 'rxjs'

let tokenMap = {}
const uploader = Uploader.create({
  ossConfig: {
    enable: true,
    provider: 'qiniu',
    objectKeyGenerator (file: UploadFile) {
      console.log('objectKeyGenerator -> objectKeyGenerator', arguments)
      return tokenMap[file.id].key
    },
    uptokenGenerator (file: UploadFile) {
      console.log('uptokenGenerator -> uptokenGenerator', arguments)
      let url = 'http://saas.test.work.zving.com/server/companys/f05dd7da36ba4e238f9c1f053c2e76e3/oss/client/uptoken'
      let headers = {
        CMPID: 'f05dd7da36ba4e238f9c1f053c2e76e3',
        GUID: '787845727d8345289a9bdc97de6e8556',
        TOKEN:
          'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlY20gY2xpZW50IiwiaXNzIjoienZpbmciLCJjbGFpbURlZmF1bHRLZXkiOiJsaXVsZWkwMSIsImV4cCI6MTYwNTg2ODU1MSwiaWF0IjoxNjA1MjYzNzUxLCJqdGkiOiIzNDBhMGFhMjRiM2Q0YWNhYTZlZGJhYmYyNzFhODU1ZCJ9.Z2er-FrFSU020TgApgtPULzIhamjE1tqin8t4kyN3FA',
      }
      url = `${url}?fileName=${file.name}&fileSize=${file.size}&relativePath=${file.relativePath}`
      let ob$: Observable<{ key: string; token: string }> = ajax.getJSON(url, headers)
      return ob$.toPromise().then((res) => {
        console.log('uptokenGenerator -> res', res)
        tokenMap[file.id] = res
        return res.token
      })
    },
  },
  serverURL: function (task: UploadTask, uploadfile: UploadFile) {
    // console.log('serverURL', task, uploadfile)
    // return 'http://10.2.45.100:2081/catalogs/1102/files/upload'
    return 'http://ecm.test.work.zving.com/catalogs/4751/files/upload'
  },
  requestHeaders: function (task: UploadTask, uploadfile: UploadFile) {
    // console.log('requestHeaders', task, uploadfile)
    return {
      CMPID: 'f05dd7da36ba4e238f9c1f053c2e76e3',
      // CMPID: 'c336c544d2ea41c9ae9d93efa0e638a0',
      // TOKEN:
      //   'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlY20gY2xpZW50IiwiaXNzIjoienZpbmciLCJjbGFpbURlZmF1bHRLZXkiOiJsaXVsZWkwMSIsImV4cCI6MTYwMzYwOTcyNywiaWF0IjoxNjAzMDA0OTI3LCJqdGkiOiIzZjZlNjZkMWIxNTU0NjBiODY2MDFkYzQxNTk3YWQ3YiJ9.BVL6a79QFS0NQJFzUZbnFodOIk6AINdIntwBQq96ZsQ',
      TOKEN:
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlY20gY2xpZW50IiwiaXNzIjoienZpbmciLCJjbGFpbURlZmF1bHRLZXkiOiJsaXVsZWkwMSIsImV4cCI6MTYwNDY0MTU2NiwiaWF0IjoxNjA0MDM2NzY2LCJqdGkiOiI1NjFjZWYwODkxZTM0MDVmYmQxNDI5OTA1YWM4ZTg2YSJ9.vHhpeDkrPTLCsx3QC0XpIcSk8NagEiR4dDcTTTksX_U',
      GUID: 'b1da407ce0a5408b847f4151d41783ff',
    }
  },
  requestParams: function (task: UploadTask, uploadfile: UploadFile) {
    // console.log('requestParams', task, uploadfile)
    return {
      chunkNumber: 1,
      identifier: uploadfile.id,
      filename: uploadfile.name,
      totalChunks: uploadfile.chunkIDList?.length,
    }
  },
  beforeFileHashCompute (file: UploadFile, task: UploadTask) {
    // return new Promise((resolve, reejct) => {
    //   console.log('beforeFileHashCompute -> file', file, task)
    //   let num = 5
    //   let timer = setInterval(() => {
    //     console.log('beforeFileHashCompute', num--)
    //     if (num < 0) {
    //       clearInterval(timer)
    //       resolve()
    //     }
    //   }, 1000)
    // })
  },
  beforeUploadRequestSend (v, file, task) {
    // console.log('beforeUploadRequestSend -> v,file,task', v, file, task)
  },
  uploadRequestSent (v, file, task) {
    // console.log('uploadRequestSent -> v,file,task', v, file, task)
  },
  fileHashComputed (file: UploadFile, task: UploadTask) {
    // console.log('fileHashComputed -> file', file)
  },
  readFileFn: function (task: UploadTask, uploadfile: UploadFile, chunk: FileChunk) {
    console.log(uploadfile, task, chunk)
    return new Promise((resolve, reject) => {
      resolve(uploadfile.raw?.slice(chunk.start, chunk.end))
    })
  },
  // unpresistTaskWhenSuccess: false,
  // fsAdapter:{},
  autoUpload: false,
  singleTask: true,
  skipFileWhenUploadError: true,
  chunkSize: 1024 * 1024,
  computeFileHash: false,
  computeChunkHash: true,
  resumable: false,
  chunkConcurrency: 2,
  taskConcurrency: 2,
  maxRetryTimes: 1,
  retryInterval: 1000,
  filePicker: [
    { $el: document.querySelector('#fileInput') as HTMLInputElement, directory: false, multiple: true },
    { $el: document.querySelector('#fileInput1') as HTMLInputElement, directory: true, multiple: true },
  ],
  fileDragger: {
    // $el: document.querySelector('#file-dragger') as HTMLDivElement,
    $el: document.body,
    onDragenter: (e) => {
      // $('#file-dragger').html('松开鼠标上传')
    },
    onDragleave: (e) => {
      // $('#file-dragger').html('拖拽文件到此处上传')
    },
    onDrop: (e) => {
      console.log(e)
      // $('#file-dragger').html('拖拽文件到此处上传')
    },
  },
})
console.log('uploader', uploader)

const taskMap = {}
const appendHtml = (task: UploadTask) => {
  taskMap[task.id] = task
  let html = `
    <div id="${task.id}" style="margin:10px;padding:10px;border:1px solid;width;100%">
      <div style="width:100%;display:flex;text-align:center">
        <div style="width:50%;text-align:left">${task.name}</div>
        <div style="width:10%" class="task-progress">${task.progress}</div>
        <div style="width:10%" class="task-status">${task.status}</div>
        <div style="width:30%">
          <button class="uploadBtn" taskID="${task.id}">upload</button>
          <button class="pauseBtn" taskID="${task.id}">pause</button>
          <button class="resumeBtn" taskID="${task.id}">resume</button>
          <button class="retryBtn" taskID="${task.id}">retry</button>
          <button class="cancelBtn" taskID="${task.id}">cancel</button>
        </div>
      </div>
    </div>
  `

  $('#task-container').append(html)
  setTimeout(() => {
    $(`#${task.id} .uploadBtn`).on('click', (e: JQuery.ClickEvent) => {
      let taskID = $(e.target).attr('taskID') as string
      let task = taskMap[taskID]
      uploader.upload(task)
    })
    $(`#${task.id}  .pauseBtn`).on('click', (e: JQuery.ClickEvent) => {
      let taskID = $(e.target).attr('taskID') as string
      let task = taskMap[taskID]
      uploader.pause(task)
    })
    $(`#${task.id}  .resumeBtn`).on('click', (e: JQuery.ClickEvent) => {
      let taskID = $(e.target).attr('taskID') as string
      let task = taskMap[taskID]
      uploader.resume(task)
    })
    $(`#${task.id}  .retryBtn`).on('click', (e: JQuery.ClickEvent) => {
      let taskID = $(e.target).attr('taskID') as string
      let task = taskMap[taskID]
      uploader.retry(task)
    })
    $(`#${task.id}  .cancelBtn`).on('click', (e: JQuery.ClickEvent) => {
      let taskID = $(e.target).attr('taskID') as string
      let task = taskMap[taskID]
      uploader.cancel(task)
    })
  }, 500)
}
uploader.on(EventType.TaskAdd, appendHtml)
uploader.on(EventType.TaskRestore, appendHtml)
uploader.on(EventType.TaskUploadStart, (task: UploadTask) => {
  $(`#${task.id} .task-status`).html(task.status)
})
uploader.on(EventType.TaskProgress, (progress: number, task: UploadTask, file: UploadFile) => {
  // console.log('===TaskProgress', task)
  $(`#${task.id} .task-progress`).html(String(progress))
  $(`#${task.id} .task-status`).html(task.status)
})
uploader.on(EventType.TaskComplete, (task: UploadTask) => {
  console.log('===TaskComplete', task)
  $(`#${task.id} .task-status`).html(task.status)
})
uploader.on(EventType.TaskPaused, (task: UploadTask) => {
  console.log('===TaskPaused', task)
  $(`#${task.id} .task-status`).html(task.status)
})
uploader.on(EventType.TaskCanceled, (task: UploadTask) => {
  console.log('===TaskCanceled', task)
  $(`#${task.id}`).remove()
})
uploader.on(EventType.Complete, () => {
  console.warn('Complete--------------------------------------------------------------------')
  uploader.clear()
})

setTimeout(() => {
  $('#uploadBtn')?.on('click', () => {
    console.log('begin upload')
    uploader.upload()
  })
  $('#pauseBtn')?.on('click', () => {
    console.log('pause upload')
    uploader.pause()
  })
  $('#resumeBtn')?.on('click', () => {
    console.log('resume upload')
    uploader.resume()
  })
  $('#retryBtn')?.on('click', () => {
    console.log('retry upload')
    uploader.retry()
  })
  $('#cancelBtn')?.on('click', () => {
    console.log('cancel upload')
    uploader.cancel()
  })
}, 500)

console.log(Object.keys(EventType))

Object.assign(window, { up: uploader })
