import { UploadTask } from '../modules/UploadTask'
import { Observable, Subscriber, of, from, forkJoin } from 'rxjs'
import { ID, StringKeyObject, StatusCode } from '../../types'
import { fileReader } from '../helpers/brower/file-reader'
import { tap, concatMap, mapTo, map, switchMap } from 'rxjs/operators'
import { FileStore, UploadFile, FileChunk, Storage } from '../modules'
import { UploaderOptions } from '..'
import Base from '../Base'
import { md5WorkerPool } from '../../worker'

export default abstract class TaskHandler extends Base {
  public task: UploadTask
  protected uploaderOptions: UploaderOptions

  constructor (task: UploadTask, uploaderOptions: UploaderOptions) {
    super()
    this.task = task
    this.uploaderOptions = uploaderOptions
  }

  abstract handle (): void
  abstract pause (): void
  abstract resume (): void
  abstract retry (): void
  abstract abort (): void

  protected computeFileHash (file: Blob | undefined, algorithm?: string): Observable<string> {
    if (!file) {
      return of('')
    }
    return new Observable((ob: Subscriber<string>) => {
      algorithm = algorithm || 'md5'
      const sparkMd5 = new SparkMD5.ArrayBuffer()
      const fileReader = new FileReader()
      fileReader.readAsArrayBuffer(file)
      fileReader.onload = (e: ProgressEvent<FileReader>) => {
        let res: ArrayBuffer = e!.target!.result as ArrayBuffer
        sparkMd5.append(res)
        let md5 = sparkMd5.end()
        ob.next(md5)
        ob.complete()
      }
      fileReader.onerror = (error) => {
        ob.error(error)
      }
      return () => fileReader.abort()
    })
  }

  protected computeFileMd5ByWorker (uploadFile: UploadFile): Observable<string>
  protected computeFileMd5ByWorker (blob: Blob): Observable<string>
  protected computeFileMd5ByWorker (data: UploadFile | Blob): Observable<string> {
    if (data instanceof Blob) {
      return from(md5WorkerPool.execute(data))
    } else {
      return this.readFile(data).pipe(switchMap((data: Blob) => from(md5WorkerPool.execute(data))))
    }
  }

  protected toFormData (params: StringKeyObject): FormData {
    const formData = new FormData()
    Object.keys(params).forEach((k) => formData.append(k, params[k]))
    return formData
  }

  protected getServerURL (uploadfile: UploadFile, chunk: FileChunk): Observable<string> {
    return this.createObserverble(this.uploaderOptions.requestOptions.url, this.task, uploadfile, chunk)
  }

  protected getRequestHeaders (uploadfile: UploadFile): Observable<StringKeyObject | undefined> {
    return this.createObserverble(this.uploaderOptions.requestOptions.headers, this.task, uploadfile)
  }

  protected getRequestParams (
    uploadfile: UploadFile,
    baseParams: StringKeyObject,
  ): Observable<StringKeyObject | undefined> {
    return this.createObserverble(this.uploaderOptions.requestOptions.body, this.task, uploadfile, baseParams)
  }

  protected computeHashWhen (blob: Blob | undefined, algorithm: string, condition: boolean): Observable<string> {
    return condition ? this.computeFileHash(blob, algorithm) : of('')
  }

  protected getUploadFileByID (id: ID): Observable<UploadFile | null> {
    return new Observable((ob: Subscriber<UploadFile | null>) => {
      let uploadFile = FileStore.get(id)
      let file$: Observable<UploadFile | null>
      if (uploadFile) {
        file$ = of(uploadFile)
      } else {
        file$ = from(Storage.UploadFile.getItem(String(id))).pipe(
          concatMap((file: unknown) => {
            if (!file) {
              return of(null)
            }
            const source = []
            const upfile = file as UploadFile
            const { chunkIDList, chunkList } = upfile
            if (chunkIDList && chunkIDList.length && (!chunkList || chunkList.length !== chunkIDList.length)) {
              source.push(
                from(Storage.FileChunk.getItems(chunkIDList as Array<string>)).pipe(
                  map((res) => Object.values(res) as Array<FileChunk>),
                  tap((chunkList: FileChunk[]) => {
                    upfile.chunkList = chunkList.filter((ck) => {
                      if (ck) {
                        ck.status = ck.status === StatusCode.Complete ? ck.status : StatusCode.Pause
                      }
                      return !!ck
                    }) as FileChunk[]
                  }),
                ),
              )
            }
            if (!upfile.raw) {
              source.push(
                from(Storage.BinaryLike.getItem(String(upfile.id))).pipe(
                  tap((blob: unknown) => {
                    upfile.raw = blob ? (blob as Blob) : upfile.raw
                  }),
                ),
              )
            }
            upfile.status = upfile.status === StatusCode.Complete ? upfile.status : StatusCode.Pause
            // upfile.status = upfile.status === StatusCode.Uploading ? StatusCode.Pause : upfile.status
            upfile.progress = upfile.status === StatusCode.Complete ? 100 : upfile.progress
            return source.length ? forkJoin(source).pipe(mapTo(upfile)) : of(upfile)
          }),
          tap((upfile) => {
            upfile && FileStore.add(upfile)
          }),
        )
      }
      const sub = file$.subscribe(ob)
      return () => sub.unsubscribe()
    })
  }

  protected readFile (uploadfile: UploadFile, chunk?: FileChunk): Observable<Blob> {
    return new Observable((ob: Subscriber<Blob>) => {
      let reader = this.uploaderOptions.readFileFn
      let res: Promise<Blob> | Blob
      if (typeof reader === 'function') {
        res = reader(this.task, uploadfile, chunk?.start, chunk?.end)
      } else {
        res = fileReader(uploadfile, chunk?.start, chunk?.end)
      }
      const sub = this.toObserverble(res).subscribe(ob)
      return () => sub.unsubscribe()
    })
  }
}
