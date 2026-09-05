# clasp-profile-wrapper

公式 [`@google/clasp`](https://github.com/google/clasp) を内部依存に持つグローバルラッパー。普通の `clasp` コマンドに対して、名前付きプロファイルに応じた `--user` を自動注入し、`gh auth switch` のような感覚でアカウントを切り替えられるようにする。

外部から見えるコマンド名は `clasp` のまま。公式CLI本体は改造せず、コマンド引数を前段で組み立てて転送するだけ。

## 必要環境

- Node.js `>= 20.6.0`

  `import.meta.resolve()` をフラグなし・同期的に使うため。Node 20.0〜20.5ではこのAPIが `--experimental-import-meta-resolve` なしでは使えず動作しない。

## インストール

```bash
npm uninstall -g @google/clasp
```

```bash
git clone https://github.com/maru0014/clasp-profile-wrapper.git
cd clasp-profile-wrapper
npm install
npm install -g .
```

確認:

```bash
where clasp      # Windows
command -v clasp # macOS/Linux
clasp --version
```

## 使い方

### アカウントを登録する

```bash
clasp login --user codelife
clasp login --user marumo
```

`--user` を明示したログインなので、ラッパーは何もプロファイルを注入しない。

### アクティブなプロファイルを切り替える

```bash
clasp switch codelife          # PC全体のデフォルトを切り替える
clasp switch marumo --local    # 現在のプロジェクトだけ上書きする
```

指定した名前がまだ `clasp login --user <name>` されていない場合は警告が出るが、切り替え自体はブロックしない(先に名前だけ決めておく運用のため)。

### 確認する

```bash
clasp whoami     # 現在のアクティブプロファイルと設定元(environment/project/global)
clasp profiles   # ログイン済みプロファイル一覧。 * が現在のアクティブ
```

### あとは普通に使う

```bash
clasp push
clasp pull
clasp deploy
```

内部では `clasp --user <profile> push` のように公式CLIへ転送される。一時的に別アカウントを使いたい場合は明示指定が優先される。

```bash
clasp push --user marumo   # 保存済みのアクティブプロファイルは変更しない
```

## 設定の優先順位

| 優先度 | 設定 | 用途 |
|---|---|---|
| 1 | コマンドの `--user` / `-u` | 1回だけ別アカウントを使う |
| 2 | 環境変数 `CLASP_ACTIVE_PROFILE` | CI・一時的な環境上書き |
| 3 | プロジェクトの `.clasp-user`(`clasp switch <name> --local`で作成) | 案件ごとの固定 |
| 4 | ユーザー共通のactive profile(`clasp switch <name>`で作成) | 通常利用 |
| 5 | 未設定 | エラーで停止(公式`default`へはフォールバックしない) |

`--adc`・`--auth`(非推奨)が指定されている場合は、別の認証方式とみなしプロファイル注入の対象外にする。`--help`・`--version`・引数なしも注入しない。

## ハマりどころ: 環境変数の永続化

PowerShellで `[Environment]::SetEnvironmentVariable('CLASP_ACTIVE_PROFILE', $name, 'User')` のような形でユーザー環境変数を永続化する仕組みを過去に自作していた場合、それを削除しても **`Remove-Item Env:\CLASP_ACTIVE_PROFILE` は現在のセッションの値を消すだけ** で、レジストリに保存された永続値(`[Environment]::SetEnvironmentVariable(...,'User')`で設定したもの)は消えない。

優先順位の2番目(環境変数)は4番目(グローナルのactive profile)より強いため、永続値が残っていると `clasp switch` がいくら成功しても反映されているように見えない。次のコマンドで永続値を直接確認・削除する。

```powershell
[Environment]::GetEnvironmentVariable("CLASP_ACTIVE_PROFILE","User")
[Environment]::SetEnvironmentVariable("CLASP_ACTIVE_PROFILE", $null, "User")
```

削除後、既に開いているセッションには反映されないので、そのセッション内では追加で `Remove-Item Env:\CLASP_ACTIVE_PROFILE` を実行するか、ターミナルを開き直す。

## 仕組み

- `clasp switch` / `clasp whoami` / `clasp profiles` の3つだけをラッパー自身が処理し、それ以外は公式`clasp`へ転送する。
- `PATH`上の`clasp`は呼ばない。`import.meta.resolve('@google/clasp')` で依存パッケージのエントリーファイルを直接解決し、`process.execPath`(現在動いているNode.js)で起動する。これによりラッパー自身が`clasp`という名前でグローバルインストールされていても、自分自身への再帰呼び出しにならない。
- グローバル設定の保存先はOSごとに異なる。

  | OS | 保存先 |
  |---|---|
  | Windows | `%APPDATA%\clasp-profile-wrapper\active-user` |
  | macOS・Linux | `$XDG_CONFIG_HOME/clasp-profile-wrapper/active-user`(未設定時は`~/.config/...`) |

- 保存するのはプロファイル名のみ。認証トークン自体は公式clasp本体の`.clasprc.json`がそのまま管理する。

## ライセンス

Private use.
