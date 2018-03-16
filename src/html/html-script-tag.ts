/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Document, DocumentBackreference, Import, ScannedImport} from '../model/model';

/**
 * <script> tags are represented in two different ways: as inline documents,
 * or as imports, depending on whether the tag has a `src` attribute. This class
 * represents a script tag with a `src` attribute as an import, so that the
 * analyzer loads and parses the referenced document.
 */
export class ScriptTagImport extends Import { readonly type = 'html-script'; }

export class ScannedScriptTagImport extends ScannedImport {
  resolve(document: Document): ScriptTagImport|undefined {
    const resolvedUrl = this.getLoadableUrlOrWarn(document);
    if (this.url === undefined || resolvedUrl === undefined) {
      // Warning will already have been added to the document if necessary, so
      // we can just return here.
      return undefined;
    }

    // TODO(justinfagnani): warn if the same URL is loaded from more than one
    // non-module script tag

    // TODO(justinfagnani): Use the analyzer cache, since this is duplicating an
    // analysis of the external script, but the document the analyzer has
    // doesn't have its container as a feature.
    // A better design might be to have the import itself be in charge of
    // producing document objects. This will fit better with JS modules, where
    // the type attribute drives how the document is parsed.
    //
    // See https://github.com/Polymer/polymer-analyzer/issues/615

    const scannedDocument =
        document._analysisContext._getScannedDocument(resolvedUrl);
    if (scannedDocument) {
      const importedDocument =
          new Document(scannedDocument, document._analysisContext);

      // Scripts regularly make use of global variables or functions (e.g.
      // `Polymer()`, `$('#some-id')`, etc) that are defined in libraries
      // which are loaded via prior script tags or HTML imports.  Since
      // JavaScript defined within `<script>` tags or loaded by a
      // `<script src=...>` share scope with other scripts previously
      // loaded by the page, this synthetic import is added to support
      // queries for features of the HTML document which should be "visible"
      // to the JavaScript document.
      const backReference = new DocumentBackreference(document);
      importedDocument._addFeature(backReference);
      importedDocument.resolve();

      return new ScriptTagImport(
          resolvedUrl,
          this.url,
          this.type,
          importedDocument,
          this.sourceRange,
          this.urlSourceRange,
          this.astNode,
          this.warnings,
          false);
    } else {
      // not found or syntax error
      this.addCouldNotLoadWarning(document);
      return undefined;
    }
  }
}
